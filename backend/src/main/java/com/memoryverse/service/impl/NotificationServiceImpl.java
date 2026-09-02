package com.memoryverse.service.impl;

import com.memoryverse.config.RedisConfig;
import com.memoryverse.dto.response.NotificationResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.entity.Notification;
import com.memoryverse.entity.NotificationType;
import com.memoryverse.entity.User;
import com.memoryverse.repository.NotificationRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<NotificationResponseDto> getNotifications(UUID userId, Pageable pageable) {
        Page<Notification> page = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable);
        return PagedResponse.<NotificationResponseDto>builder()
                .content(page.getContent().stream().map(NotificationResponseDto::fromEntity).toList())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_UNREAD_COUNT, key = "#userId")
    public long getUnreadCount(UUID userId) {
        log.debug("Fetching unread notifications count from database for user: {}", userId);
        return notificationRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_UNREAD_COUNT, key = "#userId")
    public void markAsRead(UUID id, UUID userId) {
        log.info("Marking notification {} as read for user {}", id, userId);
        notificationRepository.markAsRead(id, userId);
    }

    @Override
    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_UNREAD_COUNT, key = "#userId")
    public void markAllAsRead(UUID userId) {
        log.info("Marking all notifications as read for user {}", userId);
        notificationRepository.markAllAsRead(userId);
    }

    @Override
    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_UNREAD_COUNT, allEntries = true)
    public Notification createNotification(User recipient, String message, NotificationType type, UUID relatedEntityId) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .message(message)
                .type(type)
                .relatedEntityId(relatedEntityId)
                .isRead(false)
                .build();
        return notificationRepository.save(notification);
    }

    @Override
    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_UNREAD_COUNT, allEntries = true)
    public void notifyGroup(User actor, String actorMessage, String othersMessage, NotificationType type, UUID relatedEntityId) {
        try {
            List<User> allUsers = userRepository.findAll();
            for (User user : allUsers) {
                String msg = (actor != null && user.getId().equals(actor.getId())) ? actorMessage : othersMessage;
                Notification notification = Notification.builder()
                        .recipient(user)
                        .message(msg)
                        .type(type)
                        .relatedEntityId(relatedEntityId)
                        .isRead(false)
                        .build();
                notificationRepository.save(notification);
            }
            log.info("Broadcasted notification type='{}' to {} members", type, allUsers.size());
        } catch (Exception ex) {
            log.error("Failed to broadcast group notification (type={}): {}", type, ex.getMessage());
        }
    }
}
