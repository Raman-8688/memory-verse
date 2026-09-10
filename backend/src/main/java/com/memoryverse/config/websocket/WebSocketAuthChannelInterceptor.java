package com.memoryverse.config.websocket;

import com.memoryverse.entity.User;
import com.memoryverse.exception.ForbiddenException;
import com.memoryverse.exception.UnauthorizedException;
import com.memoryverse.repository.ChatGroupMemberRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.security.JwtTokenProvider;
import com.memoryverse.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern GROUP_TOPIC_PATTERN = Pattern.compile("^/topic/chat/groups/([a-fA-F0-9\\-]+).*$");
    private static final Pattern USER_TOPIC_PATTERN = Pattern.compile("^/topic/users/([a-fA-F0-9\\-]+).*$");

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (StompCommand.CONNECT.equals(command)) {
            handleConnect(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            handleSubscribe(accessor);
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        String token = extractToken(accessor);
        if (token == null || !jwtTokenProvider.validateToken(token)) {
            log.warn("WebSocket STOMP CONNECT rejected: missing or invalid JWT token");
            throw new UnauthorizedException("Invalid or missing JWT token for WebSocket connection");
        }

        UUID userId = jwtTokenProvider.getUserIdFromToken(token);
        String email = jwtTokenProvider.getEmailFromToken(token);
        String role = jwtTokenProvider.getRoleFromToken(token);

        User user = userRepository.findById(userId).orElse(null);
        String fullName = user != null ? user.getFullName() : email;
        String password = user != null ? user.getPassword() : "";

        UserPrincipal principal = UserPrincipal.create(userId, email, fullName, password, role != null ? role : "USER");
        Authentication auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        accessor.setUser(auth);
        log.info("WebSocket STOMP session [{}] authenticated for user [{}] ({})", accessor.getSessionId(), userId, email);
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }

        Authentication auth = (Authentication) accessor.getUser();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            log.warn("Subscription rejected: Unauthenticated session attempted to subscribe to {}", destination);
            throw new UnauthorizedException("Authentication required to subscribe to topics");
        }

        UUID authenticatedUserId = principal.getId();

        Matcher groupMatcher = GROUP_TOPIC_PATTERN.matcher(destination);
        if (groupMatcher.matches()) {
            String groupIdStr = groupMatcher.group(1);
            UUID groupId;
            try {
                groupId = UUID.fromString(groupIdStr);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid group ID in subscription destination: {}", destination);
                throw new ForbiddenException("Invalid group destination: " + destination);
            }

            boolean isMember = chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupId, authenticatedUserId);
            if (!isMember) {
                log.warn("Subscription rejected: User [{}] is not a member of group [{}]", authenticatedUserId, groupId);
                throw new ForbiddenException("You are not authorized to subscribe to group " + groupId);
            }

            log.debug("User [{}] authorized and subscribed to [{}]", authenticatedUserId, destination);
            return;
        }

        Matcher userMatcher = USER_TOPIC_PATTERN.matcher(destination);
        if (userMatcher.matches()) {
            String targetUserIdStr = userMatcher.group(1);
            UUID targetUserId;
            try {
                targetUserId = UUID.fromString(targetUserIdStr);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid user ID in subscription destination: {}", destination);
                throw new ForbiddenException("Invalid user destination: " + destination);
            }

            if (!authenticatedUserId.equals(targetUserId)) {
                log.warn("Subscription rejected: User [{}] attempted to subscribe to notifications for user [{}]",
                        authenticatedUserId, targetUserId);
                throw new ForbiddenException("You are not authorized to subscribe to notifications for other users");
            }

            log.debug("User [{}] authorized and subscribed to user topic [{}]", authenticatedUserId, destination);
        }
    }

    private String extractToken(StompHeaderAccessor accessor) {
        // Check Authorization native header
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            authHeaders = accessor.getNativeHeader("authorization");
        }
        if (authHeaders == null || authHeaders.isEmpty()) {
            authHeaders = accessor.getNativeHeader("X-Authorization");
        }

        if (authHeaders != null && !authHeaders.isEmpty()) {
            String raw = authHeaders.get(0);
            if (raw != null && raw.startsWith("Bearer ")) {
                return raw.substring(7).trim();
            }
            return raw != null ? raw.trim() : null;
        }

        // Check query param if passed during handshake/connect
        List<String> tokenHeaders = accessor.getNativeHeader("token");
        if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
            return tokenHeaders.get(0);
        }

        return null;
    }
}
