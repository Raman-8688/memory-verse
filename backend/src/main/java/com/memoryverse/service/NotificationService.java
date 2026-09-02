package com.memoryverse.service;

import com.memoryverse.dto.response.NotificationResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.entity.Notification;
import com.memoryverse.entity.NotificationType;
import com.memoryverse.entity.User;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface NotificationService {

    PagedResponse<NotificationResponseDto> getNotifications(UUID userId, Pageable pageable);

    long getUnreadCount(UUID userId);

    void markAsRead(UUID id, UUID userId);

    void markAllAsRead(UUID userId);

    Notification createNotification(User recipient, String message, NotificationType type, UUID relatedEntityId);

    void notifyGroup(User actor, String actorMessage, String othersMessage, NotificationType type, UUID relatedEntityId);
}
