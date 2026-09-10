package com.memoryverse.config.websocket;

import com.memoryverse.dto.realtime.ChatRealtimeEvent;
import com.memoryverse.dto.realtime.ChatRealtimeEventType;
import com.memoryverse.repository.ChatGroupMemberRepository;
import com.memoryverse.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Intercepts outbound STOMP messages dispatched from the broker to connected client sessions.
 * Enforces active membership verification so that any user removed from a group immediately ceases
 * receiving subsequent group messages and events over WebSocket/STOMP (P1-01 hardening).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketOutboundChannelInterceptor implements ChannelInterceptor {

    private static final Pattern GROUP_TOPIC_PATTERN = Pattern.compile("^/topic/chat/groups/([a-fA-F0-9\\-]+).*$");

    private final ChatGroupMemberRepository chatGroupMemberRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        // Only inspect MESSAGE type frames destined for client sessions
        if (!SimpMessageType.MESSAGE.equals(accessor.getMessageType())) {
            return message;
        }

        String destination = accessor.getDestination();
        if (destination == null) {
            return message;
        }

        Matcher groupMatcher = GROUP_TOPIC_PATTERN.matcher(destination);
        if (!groupMatcher.matches()) {
            return message;
        }

        String groupIdStr = groupMatcher.group(1);
        UUID groupId;
        try {
            groupId = UUID.fromString(groupIdStr);
        } catch (IllegalArgumentException e) {
            return message;
        }

        Authentication auth = (Authentication) accessor.getUser();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            log.warn("Dropping outbound message to [{}] for unauthenticated STOMP session [{}]", destination, accessor.getSessionId());
            return null;
        }

        UUID userId = principal.getId();

        // Check if user is currently an active member in DB
        boolean isMember = chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupId, userId);
        if (!isMember) {
            // Check if this payload is the MEMBER_REMOVED notification intended for this specific user
            Object payload = message.getPayload();
            if (isMemberRemovedNotificationForUser(payload, userId)) {
                log.info("Delivering final MEMBER_REMOVED notification to evicted user [{}] for group [{}]", userId, groupId);
                return message;
            }

            log.warn("Blocked outbound group message on [{}] for evicted/non-member user [{}] (Session: {})",
                    destination, userId, accessor.getSessionId());
            return null; // Dropping the message stops transmission to this evicted client
        }

        return message;
    }

    private boolean isMemberRemovedNotificationForUser(Object payload, UUID userId) {
        if (payload instanceof ChatRealtimeEvent<?> event) {
            if (ChatRealtimeEventType.MEMBER_REMOVED.equals(event.getEventType())) {
                Object eventPayload = event.getPayload();
                if (eventPayload instanceof UUID removedId) {
                    return userId.equals(removedId);
                } else if (eventPayload instanceof String removedIdStr) {
                    try {
                        return userId.equals(UUID.fromString(removedIdStr));
                    } catch (Exception ignored) {
                        return false;
                    }
                }
            }
        }
        return false;
    }
}
