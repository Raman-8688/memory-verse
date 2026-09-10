package com.memoryverse.service;

import com.memoryverse.dto.realtime.ChatMessageReadDto;
import com.memoryverse.dto.realtime.ChatPresenceDto;
import com.memoryverse.dto.realtime.ChatRealtimeEvent;
import com.memoryverse.dto.realtime.ChatRealtimeEventType;
import com.memoryverse.dto.realtime.ChatTypingDto;
import com.memoryverse.dto.response.ChatGroupDetailDto;
import com.memoryverse.dto.response.ChatGroupMemberDto;
import com.memoryverse.dto.response.ChatMessageDto;
import com.memoryverse.dto.response.ChatMessageReactionDto;
import com.memoryverse.dto.response.ChatMessageReactionUpdatedDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatRealtimeEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publishMessageCreated(UUID groupId, ChatMessageDto messageDto) {
        String destination = "/topic/chat/groups/" + groupId;
        ChatRealtimeEvent<ChatMessageDto> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.MESSAGE_CREATED,
                groupId,
                messageDto
        );
        log.info("Broadcasting MESSAGE_CREATED event for message [{}] to destination [{}]", messageDto.getId(), destination);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishMessageUpdated(UUID groupId, ChatMessageDto messageDto) {
        String destination = "/topic/chat/groups/" + groupId;
        ChatRealtimeEvent<ChatMessageDto> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.MESSAGE_UPDATED,
                groupId,
                messageDto
        );
        log.info("Broadcasting MESSAGE_UPDATED event for message [{}] to destination [{}]", messageDto.getId(), destination);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishMessageDeleted(UUID groupId, UUID messageId) {
        String destination = "/topic/chat/groups/" + groupId;
        ChatRealtimeEvent<UUID> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.MESSAGE_DELETED,
                groupId,
                messageId
        );
        log.info("Broadcasting MESSAGE_DELETED event for message [{}] to destination [{}]", messageId, destination);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishReactionUpdated(UUID groupId, UUID messageId, List<ChatMessageReactionDto> reactions) {
        String destination = "/topic/chat/groups/" + groupId;
        ChatMessageReactionUpdatedDto payload = ChatMessageReactionUpdatedDto.builder()
                .messageId(messageId)
                .reactions(reactions)
                .build();
        ChatRealtimeEvent<ChatMessageReactionUpdatedDto> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.REACTION_UPDATED,
                groupId,
                payload
        );
        log.info("Broadcasting REACTION_UPDATED event for message [{}] ({} reactions) to destination [{}]",
                messageId, reactions != null ? reactions.size() : 0, destination);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishTyping(UUID groupId, UUID userId, String displayName, boolean typing) {
        String destination = "/topic/chat/groups/" + groupId;
        ChatTypingDto payload = ChatTypingDto.builder()
                .groupId(groupId)
                .userId(userId)
                .displayName(displayName)
                .typing(typing)
                .timestamp(Instant.now())
                .build();
        ChatRealtimeEvent<ChatTypingDto> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.TYPING,
                groupId,
                payload
        );
        log.debug("Broadcasting TYPING event [typing={}] for user [{}] to group [{}]", typing, userId, groupId);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishPresence(UUID groupId, UUID userId, String displayName, String status) {
        String destination = "/topic/chat/groups/" + groupId;
        ChatPresenceDto payload = ChatPresenceDto.builder()
                .userId(userId)
                .displayName(displayName)
                .status(status)
                .timestamp(Instant.now())
                .build();
        ChatRealtimeEvent<ChatPresenceDto> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.PRESENCE,
                groupId,
                payload
        );
        log.info("Broadcasting PRESENCE event [status={}] for user [{}] to group [{}]", status, userId, groupId);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishMessageRead(UUID groupId, UUID userId, UUID lastReadMessageId, Instant readAt) {
        String destination = "/topic/chat/groups/" + groupId;
        ChatMessageReadDto payload = ChatMessageReadDto.builder()
                .groupId(groupId)
                .userId(userId)
                .lastReadMessageId(lastReadMessageId)
                .readAt(readAt != null ? readAt : Instant.now())
                .build();
        ChatRealtimeEvent<ChatMessageReadDto> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.MESSAGE_READ,
                groupId,
                payload
        );
        log.info("Broadcasting MESSAGE_READ event up to message [{}] for user [{}] to group [{}]", lastReadMessageId, userId, groupId);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishGroupUpdated(UUID groupId, ChatGroupDetailDto groupDetail) {
        String destination = "/topic/chat/groups/" + groupId;
        ChatRealtimeEvent<ChatGroupDetailDto> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.GROUP_UPDATED,
                groupId,
                groupDetail
        );
        log.info("Broadcasting GROUP_UPDATED event for group [{}]", groupId);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishMemberAdded(UUID groupId, ChatGroupMemberDto memberDto) {
        String destination = "/topic/chat/groups/" + groupId;
        ChatRealtimeEvent<ChatGroupMemberDto> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.MEMBER_ADDED,
                groupId,
                memberDto
        );
        log.info("Broadcasting MEMBER_ADDED event for user [{}] in group [{}]", memberDto.getUser().getId(), groupId);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishMemberRemoved(UUID groupId, UUID removedUserId) {
        String destination = "/topic/chat/groups/" + groupId;
        ChatRealtimeEvent<UUID> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.MEMBER_REMOVED,
                groupId,
                removedUserId
        );
        log.info("Broadcasting MEMBER_REMOVED event for user [{}] in group [{}]", removedUserId, groupId);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishMemberRoleChanged(UUID groupId, UUID targetUserId, String newRole) {
        String destination = "/topic/chat/groups/" + groupId;
        Map<String, String> payload = Map.of("userId", targetUserId.toString(), "role", newRole);
        ChatRealtimeEvent<Map<String, String>> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.MEMBER_ROLE_CHANGED,
                groupId,
                payload
        );
        log.info("Broadcasting MEMBER_ROLE_CHANGED event for user [{}] to [{}] in group [{}]", targetUserId, newRole, groupId);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishNotificationCreated(UUID recipientUserId, com.memoryverse.dto.response.NotificationResponseDto notificationDto) {
        String destination = "/topic/users/" + recipientUserId + "/notifications";
        ChatRealtimeEvent<com.memoryverse.dto.response.NotificationResponseDto> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.NOTIFICATION_CREATED,
                notificationDto.getGroupId(),
                notificationDto
        );
        log.info("Broadcasting NOTIFICATION_CREATED event for notification [{}] to user [{}]", notificationDto.getId(), recipientUserId);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishNotificationRead(UUID recipientUserId, UUID notificationId) {
        String destination = "/topic/users/" + recipientUserId + "/notifications";
        ChatRealtimeEvent<UUID> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.NOTIFICATION_READ,
                null,
                notificationId
        );
        log.info("Broadcasting NOTIFICATION_READ event for notification [{}] to user [{}]", notificationId, recipientUserId);
        messagingTemplate.convertAndSend(destination, event);
    }

    public void publishNotificationReadAll(UUID recipientUserId) {
        String destination = "/topic/users/" + recipientUserId + "/notifications";
        ChatRealtimeEvent<UUID> event = ChatRealtimeEvent.of(
                ChatRealtimeEventType.NOTIFICATION_READ_ALL,
                null,
                recipientUserId
        );
        log.info("Broadcasting NOTIFICATION_READ_ALL event to user [{}]", recipientUserId);
        messagingTemplate.convertAndSend(destination, event);
    }
}
