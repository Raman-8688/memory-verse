package com.memoryverse.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.memoryverse.entity.Notification;
import com.memoryverse.entity.NotificationType;
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
public class NotificationResponseDto {
    private UUID id;
    private String message;
    private NotificationType type;
    private UUID relatedEntityId;

    private String title;
    private String preview;
    private UUID groupId;
    private String groupName;
    private UUID messageId;
    private UUID senderId;
    private String senderName;
    private String senderAvatarUrl;

    @JsonProperty("isRead")
    private boolean isRead;

    private Instant createdAt;
    private Instant readAt;

    @JsonProperty("isRead")
    public boolean getIsRead() {
        return isRead;
    }

    public void setIsRead(boolean isRead) {
        this.isRead = isRead;
    }

    public static NotificationResponseDto fromEntity(Notification notification) {
        if (notification == null) return null;
        UUID gId = notification.getGroup() != null ? notification.getGroup().getId() : null;
        String gName = notification.getGroup() != null ? notification.getGroup().getName() : null;
        UUID mId = notification.getMessageEntity() != null ? notification.getMessageEntity().getId() : null;
        UUID sId = notification.getSender() != null ? notification.getSender().getId() : null;
        String sName = notification.getSender() != null ? notification.getSender().getFullName() : null;
        String sAvatar = notification.getSender() != null ? notification.getSender().getAvatarUrl() : null;

        return NotificationResponseDto.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .type(notification.getType())
                .relatedEntityId(notification.getRelatedEntityId())
                .title(notification.getTitle())
                .preview(notification.getPreview())
                .groupId(gId)
                .groupName(gName)
                .messageId(mId)
                .senderId(sId)
                .senderName(sName)
                .senderAvatarUrl(sAvatar)
                .isRead(Boolean.TRUE.equals(notification.getIsRead()))
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .build();
    }
}
