package com.memoryverse.modules.notification;

import com.memoryverse.common.api.PagedResponse;
import com.memoryverse.config.RedisConfig;
import com.memoryverse.modules.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final com.memoryverse.modules.user.UserRepository userRepository;

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

    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_UNREAD_COUNT, key = "#userId")
    public long getUnreadCount(UUID userId) {
        log.debug("Fetching unread notifications count from database for user: {}", userId);
        return notificationRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_UNREAD_COUNT, key = "#userId")
    public void markAsRead(UUID id, UUID userId) {
        log.info("Marking notification {} as read for user {}", id, userId);
        notificationRepository.markAsRead(id, userId);
    }

    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_UNREAD_COUNT, key = "#userId")
    public void markAllAsRead(UUID userId) {
        log.info("Marking all notifications as read for user {}", userId);
        notificationRepository.markAllAsRead(userId);
    }

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

    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_UNREAD_COUNT, allEntries = true)
    public void notifyGroup(User actor, String actorMessage, String othersMessage, NotificationType type, UUID relatedEntityId) {
        java.util.List<User> allUsers = userRepository.findAll();
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
    }
}
