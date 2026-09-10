package com.memoryverse.controller;

import com.memoryverse.dto.request.ChatMessageSendDto;
import com.memoryverse.dto.request.ChatTypingRequestDto;
import com.memoryverse.exception.UnauthorizedException;
import com.memoryverse.security.UserPrincipal;
import com.memoryverse.service.ChatMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final ChatMessageService chatMessageService;

    @MessageMapping("/chat/groups/{groupId}/send")
    public void handleSendMessage(
            @DestinationVariable UUID groupId,
            @Valid @Payload ChatMessageSendDto dto,
            Principal principal) {

        UUID currentUserId = extractUserId(principal);
        log.info("Received WebSocket message for group [{}] from user [{}]", groupId, currentUserId);

        dto.setChatGroupId(groupId);
        chatMessageService.sendMessage(dto, currentUserId);
    }

    @MessageMapping("/chat/groups/{groupId}/typing")
    public void handleTyping(
            @DestinationVariable UUID groupId,
            @Payload ChatTypingRequestDto dto,
            Principal principal) {

        UserPrincipal userPrincipal = extractUserPrincipal(principal);
        UUID currentUserId = userPrincipal.getId();
        String displayName = userPrincipal.getFullName() != null && !userPrincipal.getFullName().isBlank()
                ? userPrincipal.getFullName()
                : userPrincipal.getUsername();

        boolean isTyping = dto != null && dto.isTyping();
        log.debug("Received WebSocket typing [{}] for group [{}] from user [{}] ({})", isTyping, groupId, currentUserId, displayName);

        chatMessageService.broadcastTyping(groupId, currentUserId, displayName, isTyping);
    }

    private UUID extractUserId(Principal principal) {
        return extractUserPrincipal(principal).getId();
    }

    private UserPrincipal extractUserPrincipal(Principal principal) {
        if (principal instanceof Authentication auth && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return userPrincipal;
        }
        throw new UnauthorizedException("User is not authenticated for WebSocket messaging");
    }
}
