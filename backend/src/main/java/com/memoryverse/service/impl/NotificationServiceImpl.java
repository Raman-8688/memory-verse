package com.memoryverse.service.impl;

import com.memoryverse.config.RedisConfig;
import com.memoryverse.dto.response.NotificationResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.entity.Memory;
import com.memoryverse.entity.Notification;
import com.memoryverse.entity.NotificationType;
import com.memoryverse.entity.User;
import com.memoryverse.repository.MemoryRepository;
import com.memoryverse.repository.NotificationRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final MemoryRepository memoryRepository;

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
        return notificationRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_UNREAD_COUNT, key = "#userId")
    public void markAsRead(UUID id, UUID userId) {
        notificationRepository.markAsRead(id, userId);
    }

    @Override
    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_UNREAD_COUNT, key = "#userId")
    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsRead(userId);
    }

    @Override
    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_UNREAD_COUNT, key = "#recipient.id")
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
        List<User> allUsers = userRepository.findAll();
        for (User user : allUsers) {
            String message = user.getId().equals(actor.getId()) ? actorMessage : othersMessage;
            Notification notification = Notification.builder()
                    .recipient(user)
                    .message(message)
                    .type(type)
                    .relatedEntityId(relatedEntityId)
                    .isRead(false)
                    .build();
            notificationRepository.save(notification);
        }
    }

    @Override
    @Scheduled(cron = "0 0 8 * * *") // Daily at 8:00 AM
    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_UNREAD_COUNT, allEntries = true)
    public int checkAndGenerateOnThisDayNotifications() {
        LocalDate today = LocalDate.now();
        int month = today.getMonthValue();
        int day = today.getDayOfMonth();
        int currentYear = today.getYear();

        log.info("Running daily On This Day anniversary check for date: {}-{}", month, day);

        List<Memory> anniversaryMemories = memoryRepository.findMemoriesOnThisDay(month, day);
        int notificationsSent = 0;

        for (Memory m : anniversaryMemories) {
            if (m.getMemoryDate() == null || m.getMemoryDate().getYear() >= currentYear) {
                continue;
            }

            int yearsAgo = currentYear - m.getMemoryDate().getYear();
            String yearsText = yearsAgo == 1 ? "1 year" : yearsAgo + " years";
            String placeText = m.getLocationName() != null ? " in " + m.getLocationName() : "";
            String message = String.format("✨ On This Day: %s ago (%s), '%s'%s took place.",
                    yearsText, m.getMemoryDate().getYear(), m.getTitle(), placeText);

            // Notify Creator
            if (m.getCreatedBy() != null) {
                boolean alreadyNotified = notificationRepository.existsByRecipientIdAndRelatedEntityIdAndType(
                        m.getCreatedBy().getId(), m.getId(), NotificationType.ON_THIS_DAY);
                if (!alreadyNotified) {
                    createNotification(m.getCreatedBy(), message, NotificationType.ON_THIS_DAY, m.getId());
                    notificationsSent++;
                }
            }

            // Notify Tagged Companions
            if (m.getTaggedUsers() != null) {
                for (User companion : m.getTaggedUsers()) {
                    boolean alreadyNotified = notificationRepository.existsByRecipientIdAndRelatedEntityIdAndType(
                            companion.getId(), m.getId(), NotificationType.ON_THIS_DAY);
                    if (!alreadyNotified) {
                        createNotification(companion, message, NotificationType.ON_THIS_DAY, m.getId());
                        notificationsSent++;
                    }
                }
            }
        }

        log.info("Finished On This Day check. Generated {} anniversary notifications.", notificationsSent);
        return notificationsSent;
    }
}
