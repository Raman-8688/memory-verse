package com.memoryverse.service.impl;

import com.memoryverse.entity.ChatGroupMember;
import com.memoryverse.repository.ChatGroupMemberRepository;
import com.memoryverse.service.ChatRealtimeEventPublisher;
import com.memoryverse.service.UserPresenceService;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserPresenceServiceImpl implements UserPresenceService {

    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final ChatRealtimeEventPublisher chatRealtimeEventPublisher;

    private final ConcurrentMap<UUID, Set<String>> userSessions = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, UUID> sessionUsers = new ConcurrentHashMap<>();
    private final ConcurrentMap<UUID, String> userDisplayNames = new ConcurrentHashMap<>();
    private final ConcurrentMap<UUID, ScheduledFuture<?>> pendingDisconnects = new ConcurrentHashMap<>();

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread thread = new Thread(r, "presence-grace-scheduler");
        thread.setDaemon(true);
        return thread;
    });

    private static final long DISCONNECT_GRACE_PERIOD_MS = 3500;

    @Override
    public void registerSession(UUID userId, String sessionId, String displayName) {
        if (userId == null || sessionId == null) return;

        sessionUsers.put(sessionId, userId);
        if (displayName != null && !displayName.isBlank()) {
            userDisplayNames.put(userId, displayName);
        }

        ScheduledFuture<?> pending = pendingDisconnects.remove(userId);
        if (pending != null && !pending.isDone()) {
            pending.cancel(false);
            log.debug("Cancelled pending offline transition for user [{}] due to new session [{}]", userId, sessionId);
        }

        Set<String> sessions = userSessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet());
        boolean wasOffline = sessions.isEmpty();
        sessions.add(sessionId);

        if (wasOffline) {
            log.info("User [{}] came ONLINE (session: {})", userId, sessionId);
            broadcastPresenceToUserGroups(userId, displayName != null ? displayName : "User", "ONLINE");
        }
    }

    @Override
    public void unregisterSession(String sessionId) {
        if (sessionId == null) return;

        UUID userId = sessionUsers.remove(sessionId);
        if (userId == null) return;

        Set<String> sessions = userSessions.get(userId);
        if (sessions != null) {
            sessions.remove(sessionId);
            if (sessions.isEmpty()) {
                userSessions.remove(userId);

                // Schedule grace period before broadcasting OFFLINE
                String displayName = userDisplayNames.getOrDefault(userId, "User");
                ScheduledFuture<?> existing = pendingDisconnects.remove(userId);
                if (existing != null && !existing.isDone()) {
                    existing.cancel(false);
                }

                ScheduledFuture<?> future = scheduler.schedule(() -> {
                    try {
                        pendingDisconnects.remove(userId);
                        Set<String> current = userSessions.get(userId);
                        if (current == null || current.isEmpty()) {
                            log.info("Grace period elapsed: User [{}] is now OFFLINE", userId);
                            broadcastPresenceToUserGroups(userId, displayName, "OFFLINE");
                        }
                    } catch (Exception e) {
                        log.error("Error executing offline transition for user [{}]", userId, e);
                    }
                }, DISCONNECT_GRACE_PERIOD_MS, TimeUnit.MILLISECONDS);

                pendingDisconnects.put(userId, future);
            }
        }
    }

    @Override
    public boolean isUserOnline(UUID userId) {
        if (userId == null) return false;
        Set<String> sessions = userSessions.get(userId);
        return sessions != null && !sessions.isEmpty();
    }

    @Override
    public List<UUID> getOnlineUserIds(Collection<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyList();
        }
        return userIds.stream()
                .filter(this::isUserOnline)
                .toList();
    }

    private void broadcastPresenceToUserGroups(UUID userId, String displayName, String status) {
        try {
            List<ChatGroupMember> memberships = chatGroupMemberRepository.findAllByUserId(userId);
            for (ChatGroupMember member : memberships) {
                if (member.getChatGroup() != null && !member.getChatGroup().isArchived()) {
                    chatRealtimeEventPublisher.publishPresence(
                            member.getChatGroup().getId(),
                            userId,
                            displayName,
                            status
                    );
                }
            }
        } catch (Exception e) {
            log.error("Failed to broadcast presence update for user [{}]", userId, e);
        }
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdownNow();
    }
}
