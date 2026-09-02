package com.memoryverse.dto.response;

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
    private boolean isRead;
    private Instant createdAt;

    public static NotificationResponseDto fromEntity(Notification notification) {
        if (notification == null) return null;
        return NotificationResponseDto.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .type(notification.getType())
                .relatedEntityId(notification.getRelatedEntityId())
                .isRead(Boolean.TRUE.equals(notification.getIsRead()))
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
