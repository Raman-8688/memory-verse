package com.memoryverse.dto.response;

import com.memoryverse.entity.ChatMessage;
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
public class ChatMediaItemDto {
    private UUID messageId;
    private UUID chatGroupId;
    private UUID senderId;
    private String senderName;
    private String mediaUrl;
    private String thumbnailUrl;
    private Integer mediaWidth;
    private Integer mediaHeight;
    private String mediaFormat;
    private Long mediaBytes;
    private Double mediaDuration;
    private String originalFileName;
    private com.memoryverse.entity.ChatMessageType messageType;
    private String caption;
    private Instant createdAt;

    public static ChatMediaItemDto fromEntity(ChatMessage message) {
        if (message == null || message.isDeleted()) return null;

        return ChatMediaItemDto.builder()
                .messageId(message.getId())
                .chatGroupId(message.getChatGroup() != null ? message.getChatGroup().getId() : null)
                .senderId(message.getSender() != null ? message.getSender().getId() : null)
                .senderName(message.getSender() != null ? message.getSender().getFullName() : "Unknown")
                .mediaUrl(message.getMediaUrl())
                .thumbnailUrl(message.getThumbnailUrl())
                .mediaWidth(message.getMediaWidth())
                .mediaHeight(message.getMediaHeight())
                .mediaFormat(message.getMediaFormat())
                .mediaBytes(message.getMediaBytes())
                .mediaDuration(message.getMediaDuration())
                .originalFileName(message.getOriginalFileName())
                .messageType(message.getMessageType())
                .caption(message.getTextContent())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
