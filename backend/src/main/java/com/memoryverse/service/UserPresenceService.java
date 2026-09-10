package com.memoryverse.service;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface UserPresenceService {

    void registerSession(UUID userId, String sessionId, String displayName);

    void unregisterSession(String sessionId);

    boolean isUserOnline(UUID userId);

    List<UUID> getOnlineUserIds(Collection<UUID> userIds);
}
