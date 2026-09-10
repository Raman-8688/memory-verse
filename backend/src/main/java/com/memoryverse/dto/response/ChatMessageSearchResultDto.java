package com.memoryverse.dto.response;

import com.memoryverse.entity.ChatMessage;
import com.memoryverse.entity.ChatMessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageSearchResultDto {
    private UUID messageId;
    private UUID chatGroupId;
    private UUID senderId;
    private String senderName;
    private String senderAvatarUrl;
    private ChatMessageType messageType;
    private String contentPreview;
    private String mediaUrl;
    private String thumbnailUrl;
    private Instant createdAt;

    public static ChatMessageSearchResultDto fromEntity(ChatMessage message) {
        if (message == null) return null;

        String preview;
        if (message.isDeleted()) {
            preview = "This message was deleted";
        } else if (message.getTextContent() != null && !message.getTextContent().isBlank()) {
            preview = message.getTextContent();
        } else if (message.getMessageType() == ChatMessageType.IMAGE) {
            preview = "[Photo]";
        } else if (message.getMessageType() == ChatMessageType.VIDEO) {
            preview = "[Video]" + (message.getOriginalFileName() != null ? " " + message.getOriginalFileName() : "");
        } else if (message.getMessageType() == ChatMessageType.FILE) {
            preview = "[Document]" + (message.getOriginalFileName() != null ? " " + message.getOriginalFileName() : "");
        } else {
            preview = "";
        }

        return ChatMessageSearchResultDto.builder()
                .messageId(message.getId())
                .chatGroupId(message.getChatGroup() != null ? message.getChatGroup().getId() : null)
                .senderId(message.getSender() != null ? message.getSender().getId() : null)
                .senderName(message.getSender() != null ? message.getSender().getFullName() : "Unknown")
                .senderAvatarUrl(message.getSender() != null ? message.getSender().getAvatarUrl() : null)
                .messageType(message.getMessageType())
                .contentPreview(preview)
                .mediaUrl(message.isDeleted() ? null : message.getMediaUrl())
                .thumbnailUrl(message.isDeleted() ? null : message.getThumbnailUrl())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
