package com.memoryverse.config.websocket;

import com.memoryverse.security.UserPrincipal;
import com.memoryverse.service.UserPresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketPresenceEventListener {

    private final UserPresenceService userPresenceService;

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        String sessionId = accessor.getSessionId();

        if (principal instanceof Authentication auth && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            UUID userId = userPrincipal.getId();
            String displayName = userPrincipal.getFullName() != null ? userPrincipal.getFullName() : userPrincipal.getUsername();
            log.debug("WebSocket STOMP session connected: [{}] for user [{}]", sessionId, userId);
            userPresenceService.registerSession(userId, sessionId, displayName);
        }
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        log.debug("WebSocket STOMP session disconnected: [{}]", sessionId);
        userPresenceService.unregisterSession(sessionId);
    }
}
