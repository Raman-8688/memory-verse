package com.memoryverse.service;

import com.memoryverse.dto.response.NotificationResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.entity.ChatGroup;
import com.memoryverse.entity.ChatMessage;
import com.memoryverse.entity.Notification;
import com.memoryverse.entity.NotificationType;
import com.memoryverse.entity.User;
import com.memoryverse.repository.MemoryRepository;
import com.memoryverse.repository.NotificationRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.service.impl.NotificationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MemoryRepository memoryRepository;

    @Mock
    private ChatRealtimeEventPublisher chatRealtimeEventPublisher;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private User recipient;
    private User sender;
    private ChatGroup chatGroup;
    private ChatMessage chatMessage;

    @BeforeEach
    void setUp() {
        recipient = User.builder()
                .id(UUID.randomUUID())
                .email("recipient@example.com")
                .fullName("Recipient User")
                .build();

        sender = User.builder()
                .id(UUID.randomUUID())
                .email("sender@example.com")
                .fullName("Sender User")
                .build();

        chatGroup = ChatGroup.builder()
                .id(UUID.randomUUID())
                .name("Test Group")
                .build();

        chatMessage = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(chatGroup)
                .sender(sender)
                .textContent("Hey @Recipient User")
                .build();
    }

    @Test
    @DisplayName("1. Get user notifications returns paginated DTOs")
    void testGetNotifications_Success() {
        Notification notification = Notification.builder()
                .id(UUID.randomUUID())
                .recipient(recipient)
                .sender(sender)
                .group(chatGroup)
                .messageEntity(chatMessage)
                .title("Sender User mentioned you")
                .preview("Hey @Recipient User")
                .type(NotificationType.MENTION)
                .isRead(false)
                .createdAt(Instant.now())
                .build();

        Pageable pageable = PageRequest.of(0, 10);
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(recipient.getId(), pageable))
                .thenReturn(new PageImpl<>(List.of(notification)));

        PagedResponse<NotificationResponseDto> response = notificationService.getNotifications(recipient.getId(), pageable);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("Sender User mentioned you", response.getContent().get(0).getTitle());
        assertEquals("Sender User", response.getContent().get(0).getSenderName());
        assertFalse(response.getContent().get(0).getIsRead());
    }

    @Test
    @DisplayName("2. Get unread count returns repository count")
    void testGetUnreadCount() {
        when(notificationRepository.countByRecipientIdAndIsReadFalse(recipient.getId())).thenReturn(5L);

        long count = notificationService.getUnreadCount(recipient.getId());

        assertEquals(5L, count);
        verify(notificationRepository, times(1)).countByRecipientIdAndIsReadFalse(recipient.getId());
    }

    @Test
    @DisplayName("3. Mark notification as read triggers repository and STOMP event")
    void testMarkAsRead() {
        UUID notifId = UUID.randomUUID();

        notificationService.markAsRead(notifId, recipient.getId());

        verify(notificationRepository, times(1)).markAsRead(notifId, recipient.getId());
        verify(chatRealtimeEventPublisher, times(1)).publishNotificationRead(recipient.getId(), notifId);
    }

    @Test
    @DisplayName("4. Mark all notifications as read triggers repository and STOMP event")
    void testMarkAllAsRead() {
        notificationService.markAllAsRead(recipient.getId());

        verify(notificationRepository, times(1)).markAllAsRead(recipient.getId());
        verify(chatRealtimeEventPublisher, times(1)).publishNotificationReadAll(recipient.getId());
    }

    @Test
    @DisplayName("5. Create chat notification persists and broadcasts")
    void testCreateChatNotification_Success() {
        when(notificationRepository.existsByRecipientIdAndMessageEntityIdAndType(recipient.getId(), chatMessage.getId(), NotificationType.MENTION))
                .thenReturn(false);

        Notification saved = Notification.builder()
                .id(UUID.randomUUID())
                .recipient(recipient)
                .sender(sender)
                .group(chatGroup)
                .messageEntity(chatMessage)
                .type(NotificationType.MENTION)
                .title("Mentioned")
                .preview("Preview")
                .isRead(false)
                .createdAt(Instant.now())
                .build();
        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);

        Notification result = notificationService.createChatNotification(
                recipient, sender, chatGroup, chatMessage, NotificationType.MENTION, "Mentioned", "Preview"
        );

        assertNotNull(result);
        verify(notificationRepository, times(1)).save(any(Notification.class));
        verify(chatRealtimeEventPublisher, times(1)).publishNotificationCreated(eq(recipient.getId()), any());
    }

    @Test
    @DisplayName("6. Create chat notification duplicate is prevented")
    void testCreateChatNotification_DuplicatePrevented() {
        when(notificationRepository.existsByRecipientIdAndMessageEntityIdAndType(recipient.getId(), chatMessage.getId(), NotificationType.MENTION))
                .thenReturn(true);

        Notification result = notificationService.createChatNotification(
                recipient, sender, chatGroup, chatMessage, NotificationType.MENTION, "Mentioned", "Preview"
        );

        assertNull(result);
        verify(notificationRepository, never()).save(any());
        verify(chatRealtimeEventPublisher, never()).publishNotificationCreated(any(), any());
    }

    @Test
    @DisplayName("7. Self-notification is prevented")
    void testCreateChatNotification_SelfNotificationPrevented() {
        Notification result = notificationService.createChatNotification(
                sender, sender, chatGroup, chatMessage, NotificationType.MENTION, "Mentioned", "Preview"
        );

        assertNull(result);
        verify(notificationRepository, never()).save(any());
    }
}
