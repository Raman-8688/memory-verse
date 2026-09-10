package com.memoryverse.service;

import com.memoryverse.dto.request.ChatMessageSendDto;
import com.memoryverse.dto.response.ChatMessageDto;
import com.memoryverse.dto.response.ChatMessageReactionDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.entity.ChatGroup;
import com.memoryverse.entity.ChatGroupMember;
import com.memoryverse.entity.ChatGroupRole;
import com.memoryverse.entity.ChatMessage;
import com.memoryverse.entity.ChatMessageReaction;
import com.memoryverse.entity.ChatMessageType;
import com.memoryverse.entity.User;
import com.memoryverse.exception.BusinessValidationException;
import com.memoryverse.exception.ForbiddenException;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.repository.ChatGroupMemberRepository;
import com.memoryverse.repository.ChatGroupRepository;
import com.memoryverse.repository.ChatMessageReactionRepository;
import com.memoryverse.repository.ChatMessageRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.service.impl.ChatMessageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatMessageServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private ChatMessageReactionRepository chatMessageReactionRepository;

    @Mock
    private ChatGroupRepository chatGroupRepository;

    @Mock
    private ChatGroupMemberRepository chatGroupMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private com.memoryverse.repository.ChatMessageMentionRepository chatMessageMentionRepository;

    @Mock
    private com.memoryverse.service.NotificationService notificationService;

    @Mock
    private com.memoryverse.integration.storage.CloudinaryStorageService cloudinaryStorageService;

    @Mock
    private ChatRealtimeEventPublisher chatRealtimeEventPublisher;

    @InjectMocks
    private ChatMessageServiceImpl chatMessageService;

    private User userA;
    private User userB;
    private User userC;
    private ChatGroup groupA;
    private ChatGroup groupB;
    private ChatMessage messageA;

    @BeforeEach
    void setUp() {
        userA = User.builder().id(UUID.randomUUID()).email("a@test.com").fullName("User A").build();
        userB = User.builder().id(UUID.randomUUID()).email("b@test.com").fullName("User B").build();
        userC = User.builder().id(UUID.randomUUID()).email("c@test.com").fullName("User C").build();

        groupA = ChatGroup.builder()
                .id(UUID.randomUUID())
                .name("Group A")
                .createdBy(userA)
                .archived(false)
                .build();

        groupB = ChatGroup.builder()
                .id(UUID.randomUUID())
                .name("Group B")
                .createdBy(userC)
                .archived(false)
                .build();

        messageA = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userA)
                .messageType(ChatMessageType.TEXT)
                .textContent("Hello world")
                .edited(false)
                .deleted(false)
                .reactions(new ArrayList<>())
                .createdAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("1. Member can send text message; sender is derived from current authenticated user")
    void testSendMessage_MemberSuccess() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));
        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(groupA.getId(), userA.getId()))
                .thenReturn(Optional.of(ChatGroupMember.builder().user(userA).chatGroup(groupA).build()));
        when(chatMessageRepository.save(any(ChatMessage.class))).thenAnswer(i -> {
            ChatMessage m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            m.setCreatedAt(Instant.now());
            return m;
        });

        ChatMessageSendDto sendDto = ChatMessageSendDto.builder()
                .chatGroupId(groupA.getId())
                .textContent("Hello from User A")
                .build();

        ChatMessageDto result = chatMessageService.sendMessage(sendDto, userA.getId());

        assertNotNull(result);
        assertEquals("Hello from User A", result.getTextContent());
        assertEquals("User A", result.getSender().getFullName());
    }

    @Test
    @DisplayName("2. Non-member cannot send message (ForbiddenException)")
    void testSendMessage_NonMemberForbidden() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userC.getId())).thenReturn(false);

        ChatMessageSendDto sendDto = ChatMessageSendDto.builder()
                .chatGroupId(groupA.getId())
                .textContent("Intruder text")
                .build();

        assertThrows(ForbiddenException.class, () ->
                chatMessageService.sendMessage(sendDto, userC.getId())
        );
    }

    @Test
    @DisplayName("3. Duplicate clientMessageId returns existing message idempotently without saving duplicate")
    void testSendMessage_DuplicateClientMessageIdIdempotency() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(chatMessageRepository.findByChatGroupIdAndSenderIdAndClientMessageId(groupA.getId(), userA.getId(), "client-uuid-123"))
                .thenReturn(Optional.of(messageA));

        ChatMessageSendDto sendDto = ChatMessageSendDto.builder()
                .chatGroupId(groupA.getId())
                .textContent("Hello world")
                .clientMessageId("client-uuid-123")
                .build();

        ChatMessageDto result = chatMessageService.sendMessage(sendDto, userA.getId());

        assertNotNull(result);
        assertEquals(messageA.getId(), result.getId());
        verify(chatMessageRepository, never()).save(any(ChatMessage.class));
    }

    @Test
    @DisplayName("4. Reply target must belong to the same chat group; cross-group reply throws BusinessValidationException")
    void testSendMessage_CrossGroupReplyThrows() {
        ChatMessage messageInGroupB = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupB)
                .sender(userC)
                .build();

        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(chatMessageRepository.findById(messageInGroupB.getId())).thenReturn(Optional.of(messageInGroupB));

        ChatMessageSendDto sendDto = ChatMessageSendDto.builder()
                .chatGroupId(groupA.getId())
                .textContent("Malicious reply to group B message")
                .replyToMessageId(messageInGroupB.getId())
                .build();

        assertThrows(BusinessValidationException.class, () ->
                chatMessageService.sendMessage(sendDto, userA.getId())
        );
    }

    @Test
    @DisplayName("5. User can edit their own message; editing another user's message throws ForbiddenException")
    void testEditMessage_OnlyOwnerCanEdit() {
        when(chatMessageRepository.findById(messageA.getId())).thenReturn(Optional.of(messageA));
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(messageA);

        // User A edits own message
        ChatMessageDto updated = chatMessageService.editMessage(messageA.getId(), "Updated text", userA.getId());
        assertNotNull(updated);
        assertTrue(messageA.isEdited());
        assertEquals("Updated text", messageA.getTextContent());

        // User B tries to edit User A's message -> Forbidden
        assertThrows(ForbiddenException.class, () ->
                chatMessageService.editMessage(messageA.getId(), "Hacked text", userB.getId())
        );
    }

    @Test
    @DisplayName("6. User cannot delete another user's message unless admin; soft delete preserves record")
    void testDeleteMessage_SoftDeleteAndPermissions() {
        when(chatMessageRepository.findById(messageA.getId())).thenReturn(Optional.of(messageA));
        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(groupA.getId(), userB.getId()))
                .thenReturn(Optional.of(ChatGroupMember.builder().role(ChatGroupRole.MEMBER).build()));

        // Non-admin non-owner userB cannot delete messageA
        assertThrows(ForbiddenException.class, () ->
                chatMessageService.deleteMessage(messageA.getId(), userB.getId())
        );

        // Owner userA can delete messageA
        chatMessageService.deleteMessage(messageA.getId(), userA.getId());
        assertTrue(messageA.isDeleted());
        assertNotNull(messageA.getDeletedAt());
    }

    @Test
    @DisplayName("7. Deleted message cannot be edited (BusinessValidationException)")
    void testEditDeletedMessage_Throws() {
        messageA.setDeleted(true);
        when(chatMessageRepository.findById(messageA.getId())).thenReturn(Optional.of(messageA));

        assertThrows(BusinessValidationException.class, () ->
                chatMessageService.editMessage(messageA.getId(), "New content", userA.getId())
        );
    }

    @Test
    @DisplayName("8. Valid reaction toggles on; second toggle removes reaction")
    void testToggleReaction_AddsAndRemoves() {
        when(chatMessageRepository.findById(messageA.getId())).thenReturn(Optional.of(messageA));
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatMessageReactionRepository.findByMessageIdAndUserIdAndReactionCode(messageA.getId(), userA.getId(), "❤️"))
                .thenReturn(Optional.empty());
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));

        // 1. Toggle ON
        chatMessageService.toggleReaction(messageA.getId(), "❤️", userA.getId());
        verify(chatMessageReactionRepository).saveAndFlush(any(ChatMessageReaction.class));

        // 2. Toggle OFF
        ChatMessageReaction existingReaction = ChatMessageReaction.builder()
                .id(UUID.randomUUID())
                .message(messageA)
                .user(userA)
                .reactionCode("❤️")
                .build();
        when(chatMessageReactionRepository.findByMessageIdAndUserIdAndReactionCode(messageA.getId(), userA.getId(), "❤️"))
                .thenReturn(Optional.of(existingReaction));

        chatMessageService.toggleReaction(messageA.getId(), "❤️", userA.getId());
        verify(chatMessageReactionRepository).delete(existingReaction);
    }

    @Test
    @DisplayName("9. Invalid reaction code is rejected (BusinessValidationException)")
    void testToggleReaction_InvalidCodeThrows() {
        assertThrows(BusinessValidationException.class, () ->
                chatMessageService.toggleReaction(messageA.getId(), "MALICIOUS_SCRIPT", userA.getId())
        );
    }

    @Test
    @DisplayName("10. Non-member cannot react to message from another group (ForbiddenException)")
    void testToggleReaction_NonMemberForbidden() {
        when(chatMessageRepository.findById(messageA.getId())).thenReturn(Optional.of(messageA));
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userC.getId())).thenReturn(false);

        assertThrows(ForbiddenException.class, () ->
                chatMessageService.toggleReaction(messageA.getId(), "❤️", userC.getId())
        );
    }

    @Test
    @DisplayName("11. Get group messages enforces membership and returns paginated response")
    void testGetGroupMessages_Pagination() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatMessageRepository.findByChatGroupIdOrderByCreatedAtDesc(eq(groupA.getId()), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(messageA)));

        PagedResponse<ChatMessageDto> messages = chatMessageService.getGroupMessages(groupA.getId(), userA.getId(), 0, 30);

        assertNotNull(messages);
        assertEquals(1, messages.getContent().size());
        assertEquals("Hello world", messages.getContent().get(0).getTextContent());
    }

    @Test
    @DisplayName("12. Mark messages as read updates member's lastReadMessageId and timestamp")
    void testMarkMessagesAsRead_UpdatesMember() {
        ChatGroupMember member = ChatGroupMember.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .user(userA)
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(groupA.getId(), userA.getId()))
                .thenReturn(Optional.of(member));

        UUID readMsgId = UUID.randomUUID();
        ChatMessage readMsg = ChatMessage.builder()
                .id(readMsgId)
                .chatGroup(groupA)
                .sender(userB)
                .createdAt(Instant.now())
                .build();
        when(chatMessageRepository.findById(readMsgId)).thenReturn(Optional.of(readMsg));

        chatMessageService.markMessagesAsRead(groupA.getId(), readMsgId, userA.getId());

        assertEquals(readMsgId, member.getLastReadMessageId());
        assertNotNull(member.getLastReadAt());
        verify(chatGroupMemberRepository).save(member);
    }

    @Test
    @DisplayName("13. Send image message uploads to Cloudinary, saves entity with IMAGE type, and broadcasts")
    void testSendImageMessage_Success() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));

        org.springframework.mock.web.MockMultipartFile mockFile = new org.springframework.mock.web.MockMultipartFile(
                "file", "vacation.jpg", "image/jpeg", new byte[]{1, 2, 3, 4}
        );

        com.memoryverse.dto.response.UploadedMediaResult uploadResult = com.memoryverse.dto.response.UploadedMediaResult.builder()
                .mediaUrl("https://res.cloudinary.com/demo/image/upload/sample.jpg")
                .thumbnailUrl("https://res.cloudinary.com/demo/image/upload/c_thumb,w_300/sample.jpg")
                .publicId("sample_img_123")
                .width(1200)
                .height(800)
                .fileSizeBytes(4L)
                .mediaType(com.memoryverse.entity.MediaType.IMAGE)
                .build();

        when(cloudinaryStorageService.uploadFile(any())).thenReturn(uploadResult);
        when(chatMessageRepository.save(any(ChatMessage.class))).thenAnswer(inv -> {
            ChatMessage msg = inv.getArgument(0);
            msg.setId(UUID.randomUUID());
            msg.setCreatedAt(Instant.now());
            msg.setUpdatedAt(Instant.now());
            return msg;
        });

        ChatMessageDto result = chatMessageService.sendImageMessage(
                groupA.getId(), mockFile, "Beach vacation", "client-img-1", null, userA.getId()
        );

        assertNotNull(result);
        assertEquals(ChatMessageType.IMAGE, result.getMessageType());
        assertEquals("https://res.cloudinary.com/demo/image/upload/sample.jpg", result.getMediaUrl());
        assertEquals("sample_img_123", result.getMediaPublicId());
        assertEquals("Beach vacation", result.getTextContent());
        assertEquals(1200, result.getMediaWidth());
        assertEquals(800, result.getMediaHeight());
        verify(chatRealtimeEventPublisher).publishMessageCreated(eq(groupA.getId()), any(ChatMessageDto.class));
    }

    @Test
    @DisplayName("14. Send image message with invalid MIME type throws BusinessValidationException")
    void testSendImageMessage_InvalidMimeType() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));

        org.springframework.mock.web.MockMultipartFile pdfFile = new org.springframework.mock.web.MockMultipartFile(
                "file", "document.pdf", "application/pdf", new byte[]{1, 2, 3}
        );

        assertThrows(BusinessValidationException.class, () ->
                chatMessageService.sendImageMessage(groupA.getId(), pdfFile, null, null, null, userA.getId())
        );
    }

    @Test
    @DisplayName("15. Send image message triggers orphan cleanup if DB persistence fails after Cloudinary upload")
    void testSendImageMessage_OrphanCleanupOnDbFailure() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));

        org.springframework.mock.web.MockMultipartFile mockFile = new org.springframework.mock.web.MockMultipartFile(
                "file", "photo.png", "image/png", new byte[]{1, 2, 3}
        );

        com.memoryverse.dto.response.UploadedMediaResult uploadResult = com.memoryverse.dto.response.UploadedMediaResult.builder()
                .mediaUrl("https://res.cloudinary.com/demo/image/upload/orphan.png")
                .publicId("orphan_public_id")
                .mediaType(com.memoryverse.entity.MediaType.IMAGE)
                .build();

        when(cloudinaryStorageService.uploadFile(any())).thenReturn(uploadResult);
        when(chatMessageRepository.save(any(ChatMessage.class))).thenThrow(new RuntimeException("Database error"));

        assertThrows(RuntimeException.class, () ->
                chatMessageService.sendImageMessage(groupA.getId(), mockFile, null, null, null, userA.getId())
        );

        verify(cloudinaryStorageService).deleteFile("orphan_public_id", com.memoryverse.entity.MediaType.IMAGE);
    }

    @Test
    @DisplayName("16. Editing an IMAGE message throws BusinessValidationException")
    void testEditMessage_ImageMessageThrows() {
        ChatMessage imageMsg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userA)
                .messageType(ChatMessageType.IMAGE)
                .mediaUrl("https://example.com/photo.jpg")
                .edited(false)
                .deleted(false)
                .build();

        when(chatMessageRepository.findById(imageMsg.getId())).thenReturn(Optional.of(imageMsg));

        assertThrows(BusinessValidationException.class, () ->
                chatMessageService.editMessage(imageMsg.getId(), "New text", userA.getId())
        );
    }

    @Test
    @DisplayName("17. Group ADMIN can delete another member's message")
    void testDeleteMessage_AdminCanDeleteOtherMemberMessage() {
        when(chatMessageRepository.findById(messageA.getId())).thenReturn(Optional.of(messageA));
        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(groupA.getId(), userB.getId()))
                .thenReturn(Optional.of(ChatGroupMember.builder().role(ChatGroupRole.ADMIN).build()));

        // Admin User B deletes User A's message
        chatMessageService.deleteMessage(messageA.getId(), userB.getId());
        assertTrue(messageA.isDeleted());
        assertNotNull(messageA.getDeletedAt());
        verify(chatRealtimeEventPublisher).publishMessageDeleted(eq(groupA.getId()), eq(messageA.getId()));
    }

    @Test
    @DisplayName("18. Toggle reaction broadcasts REACTION_UPDATED realtime event to group topic")
    void testToggleReaction_BroadcastsRealtimeEvent() {
        when(chatMessageRepository.findById(messageA.getId())).thenReturn(Optional.of(messageA));
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatMessageReactionRepository.findByMessageIdAndUserIdAndReactionCode(messageA.getId(), userA.getId(), "🔥"))
                .thenReturn(Optional.empty());
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));
        when(chatMessageReactionRepository.findAllByMessageId(messageA.getId())).thenReturn(List.of(
                ChatMessageReaction.builder().id(UUID.randomUUID()).message(messageA).user(userA).reactionCode("🔥").build()
        ));

        chatMessageService.toggleReaction(messageA.getId(), "🔥", userA.getId());

        verify(chatRealtimeEventPublisher).publishReactionUpdated(eq(groupA.getId()), eq(messageA.getId()), anyList());
    }

    @Test
    @DisplayName("19. Mark messages as read with message ID updates member and broadcasts MESSAGE_READ")
    void testMarkMessagesAsRead_Success_BroadcastsRealtimeEvent() {
        ChatGroupMember member = ChatGroupMember.builder()
                .chatGroup(groupA)
                .user(userA)
                .lastReadAt(Instant.now().minusSeconds(100))
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(groupA.getId(), userA.getId()))
                .thenReturn(Optional.of(member));
        when(chatMessageRepository.findById(messageA.getId())).thenReturn(Optional.of(messageA));

        chatMessageService.markMessagesAsRead(groupA.getId(), messageA.getId(), userA.getId());

        assertEquals(messageA.getId(), member.getLastReadMessageId());
        verify(chatGroupMemberRepository).save(member);
        verify(chatRealtimeEventPublisher).publishMessageRead(eq(groupA.getId()), eq(userA.getId()), eq(messageA.getId()), any(Instant.class));
    }

    @Test
    @DisplayName("20. Mark messages as read by non-member throws ForbiddenException")
    void testMarkMessagesAsRead_NonMember_ThrowsForbiddenException() {
        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(groupA.getId(), userA.getId()))
                .thenReturn(Optional.empty());

        assertThrows(ForbiddenException.class, () ->
                chatMessageService.markMessagesAsRead(groupA.getId(), messageA.getId(), userA.getId())
        );
    }

    @Test
    @DisplayName("21. Mark messages as read ignores stale message whose createdAt is before existing lastReadAt")
    void testMarkMessagesAsRead_StaleMessage_DoesNotMoveBackwards() {
        Instant newerReadAt = Instant.now();
        ChatGroupMember member = ChatGroupMember.builder()
                .chatGroup(groupA)
                .user(userA)
                .lastReadAt(newerReadAt)
                .lastReadMessageId(UUID.randomUUID())
                .build();

        ChatMessage olderMsg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userB)
                .createdAt(newerReadAt.minusSeconds(200))
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(groupA.getId(), userA.getId()))
                .thenReturn(Optional.of(member));
        when(chatMessageRepository.findById(olderMsg.getId())).thenReturn(Optional.of(olderMsg));

        chatMessageService.markMessagesAsRead(groupA.getId(), olderMsg.getId(), userA.getId());

        // Should not overwrite newer lastReadAt
        assertEquals(newerReadAt, member.getLastReadAt());
        verify(chatGroupMemberRepository, never()).save(any());
        verify(chatRealtimeEventPublisher, never()).publishMessageRead(any(), any(), any(), any());
    }

    @Test
    @DisplayName("22. Mark messages as read with null messageId marks latest message in group")
    void testMarkMessagesAsRead_NullMessageId_MarksLatestMessage() {
        ChatGroupMember member = ChatGroupMember.builder()
                .chatGroup(groupA)
                .user(userA)
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(groupA.getId(), userA.getId()))
                .thenReturn(Optional.of(member));
        when(chatMessageRepository.findLatestMessageInGroup(groupA.getId())).thenReturn(Optional.of(messageA));

        chatMessageService.markMessagesAsRead(groupA.getId(), null, userA.getId());

        assertEquals(messageA.getId(), member.getLastReadMessageId());
        verify(chatGroupMemberRepository).save(member);
        verify(chatRealtimeEventPublisher).publishMessageRead(eq(groupA.getId()), eq(userA.getId()), eq(messageA.getId()), any(Instant.class));
    }

    @Test
    @DisplayName("23. Broadcast typing succeeds for group member and broadcasts TYPING event")
    void testBroadcastTyping_Success_BroadcastsRealtimeEvent() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);

        chatMessageService.broadcastTyping(groupA.getId(), userA.getId(), "User A", true);

        verify(chatRealtimeEventPublisher).publishTyping(eq(groupA.getId()), eq(userA.getId()), eq("User A"), eq(true));
    }

    @Test
    @DisplayName("24. Broadcast typing by non-member throws ForbiddenException")
    void testBroadcastTyping_NonMember_ThrowsForbiddenException() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(false);

        assertThrows(ForbiddenException.class, () ->
                chatMessageService.broadcastTyping(groupA.getId(), userA.getId(), "User A", true)
        );
    }

    @Test
    @DisplayName("25. Search messages returns matched results within group")
    void testSearchGroupMessages_Success() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatMessageRepository.searchGroupMessages(eq(groupA.getId()), eq("Hello"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(messageA)));

        PagedResponse<com.memoryverse.dto.response.ChatMessageSearchResultDto> response =
                chatMessageService.searchGroupMessages(groupA.getId(), "Hello", 0, 20, userA.getId());

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals(messageA.getId(), response.getContent().get(0).getMessageId());
        assertEquals("Hello world", response.getContent().get(0).getContentPreview());
    }

    @Test
    @DisplayName("26. Search messages with empty query returns empty paginated list without calling repository")
    void testSearchGroupMessages_EmptyQuery() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);

        PagedResponse<com.memoryverse.dto.response.ChatMessageSearchResultDto> response =
                chatMessageService.searchGroupMessages(groupA.getId(), "   ", 0, 20, userA.getId());

        assertNotNull(response);
        assertEquals(0, response.getContent().size());
        verify(chatMessageRepository, never()).searchGroupMessages(any(), any(), any());
    }

    @Test
    @DisplayName("27. Search messages by non-member throws ForbiddenException")
    void testSearchGroupMessages_NonMemberForbidden() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userC.getId())).thenReturn(false);

        assertThrows(ForbiddenException.class, () ->
                chatMessageService.searchGroupMessages(groupA.getId(), "test", 0, 20, userC.getId())
        );
    }

    @Test
    @DisplayName("28. Get group media returns image messages gallery paginated")
    void testGetGroupMedia_Success() {
        ChatMessage imageMsg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userA)
                .messageType(ChatMessageType.IMAGE)
                .mediaUrl("https://res.cloudinary.com/demo/image/upload/photo.jpg")
                .mediaWidth(800)
                .mediaHeight(600)
                .createdAt(Instant.now())
                .edited(false)
                .deleted(false)
                .build();

        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatMessageRepository.findGroupMediaMessages(eq(groupA.getId()), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(imageMsg)));

        PagedResponse<com.memoryverse.dto.response.ChatMediaItemDto> response =
                chatMessageService.getGroupMedia(groupA.getId(), 0, 30, userA.getId());

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("https://res.cloudinary.com/demo/image/upload/photo.jpg", response.getContent().get(0).getMediaUrl());
        assertEquals(800, response.getContent().get(0).getMediaWidth());
    }

    @Test
    @DisplayName("29. Valid mention in text message creates ChatMessageMention and MENTION notification")
    void testSendMessage_ValidMention_CreatesMentionAndNotification() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));
        when(userRepository.findById(userB.getId())).thenReturn(Optional.of(userB));
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userB.getId())).thenReturn(true);

        ChatGroupMember memberB = ChatGroupMember.builder().chatGroup(groupA).user(userB).role(ChatGroupRole.MEMBER).build();
        when(chatGroupMemberRepository.findAllByChatGroupId(groupA.getId())).thenReturn(List.of(memberB));

        ChatMessage savedMsg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userA)
                .messageType(ChatMessageType.TEXT)
                .textContent("Hello @" + userB.getFullName() + " welcome!")
                .createdAt(Instant.now())
                .build();
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(savedMsg);

        ChatMessageSendDto sendDto = ChatMessageSendDto.builder()
                .chatGroupId(groupA.getId())
                .textContent("Hello @" + userB.getFullName() + " welcome!")
                .build();

        ChatMessageDto result = chatMessageService.sendMessage(sendDto, userA.getId());

        assertNotNull(result);
        verify(chatMessageMentionRepository, times(1)).save(any(com.memoryverse.entity.ChatMessageMention.class));
        verify(notificationService, times(1)).createChatNotification(
                eq(userB), eq(userA), eq(groupA), any(), eq(com.memoryverse.entity.NotificationType.MENTION), any(), any()
        );
    }

    @Test
    @DisplayName("30. Explicit mention of non-member user is rejected and ignored")
    void testSendMessage_ExplicitMentionNonMember_Ignored() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userC.getId())).thenReturn(false);

        ChatMessage savedMsg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userA)
                .messageType(ChatMessageType.TEXT)
                .textContent("Hello there")
                .createdAt(Instant.now())
                .build();
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(savedMsg);

        ChatMessageSendDto sendDto = ChatMessageSendDto.builder()
                .chatGroupId(groupA.getId())
                .textContent("Hello there")
                .mentionedUserIds(java.util.Set.of(userC.getId()))
                .build();

        ChatMessageDto result = chatMessageService.sendMessage(sendDto, userA.getId());

        assertNotNull(result);
        verify(chatMessageMentionRepository, never()).save(any());
        verify(notificationService, never()).createChatNotification(
                eq(userC), any(), any(), any(), eq(com.memoryverse.entity.NotificationType.MENTION), any(), any()
        );
    }

    @Test
    @DisplayName("31. Replying to another user's message generates REPLY notification")
    void testSendMessage_ReplyToAnotherUser_CreatesReplyNotification() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userB.getId())).thenReturn(true);

        UUID replyTargetId = UUID.randomUUID();
        ChatMessage originalMsg = ChatMessage.builder()
                .id(replyTargetId)
                .chatGroup(groupA)
                .sender(userB)
                .messageType(ChatMessageType.TEXT)
                .textContent("Original question")
                .createdAt(Instant.now().minusSeconds(60))
                .build();
        when(chatMessageRepository.findById(replyTargetId)).thenReturn(Optional.of(originalMsg));

        ChatMessage savedMsg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userA)
                .replyToMessage(originalMsg)
                .messageType(ChatMessageType.TEXT)
                .textContent("Here is the answer")
                .createdAt(Instant.now())
                .build();
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(savedMsg);

        ChatMessageSendDto sendDto = ChatMessageSendDto.builder()
                .chatGroupId(groupA.getId())
                .textContent("Here is the answer")
                .replyToMessageId(replyTargetId)
                .build();

        ChatMessageDto result = chatMessageService.sendMessage(sendDto, userA.getId());

        assertNotNull(result);
        verify(notificationService, times(1)).createChatNotification(
                eq(userB), eq(userA), eq(groupA), any(), eq(com.memoryverse.entity.NotificationType.REPLY), any(), any()
        );
    }

    @Test
    @DisplayName("32. Replying to own message does not generate notification")
    void testSendMessage_ReplyToSelf_NoNotification() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));

        UUID replyTargetId = UUID.randomUUID();
        ChatMessage originalMsg = ChatMessage.builder()
                .id(replyTargetId)
                .chatGroup(groupA)
                .sender(userA)
                .messageType(ChatMessageType.TEXT)
                .textContent("My own previous note")
                .createdAt(Instant.now().minusSeconds(60))
                .build();
        when(chatMessageRepository.findById(replyTargetId)).thenReturn(Optional.of(originalMsg));

        ChatMessage savedMsg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userA)
                .replyToMessage(originalMsg)
                .messageType(ChatMessageType.TEXT)
                .textContent("Adding more to my note")
                .createdAt(Instant.now())
                .build();
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(savedMsg);

        ChatMessageSendDto sendDto = ChatMessageSendDto.builder()
                .chatGroupId(groupA.getId())
                .textContent("Adding more to my note")
                .replyToMessageId(replyTargetId)
                .build();

        ChatMessageDto result = chatMessageService.sendMessage(sendDto, userA.getId());

        assertNotNull(result);
        verify(notificationService, never()).createChatNotification(
                any(), any(), any(), any(), eq(com.memoryverse.entity.NotificationType.REPLY), any(), any()
        );
    }

    @Test
    @DisplayName("33. Valid video upload succeeds and persists metadata")
    void testSendVideoMessage_Success() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));

        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "vacation.mp4", "video/mp4", "fake-video-content".getBytes()
        );

        com.memoryverse.dto.response.UploadedMediaResult uploadResult = com.memoryverse.dto.response.UploadedMediaResult.builder()
                .mediaUrl("https://res.cloudinary.com/demo/video/upload/v1/vacation.mp4")
                .thumbnailUrl("https://res.cloudinary.com/demo/video/upload/c_fill,h_360,w_640/vacation.jpg")
                .publicId("memoryverse/groups/videos/vacation_123")
                .fileName("vacation.mp4")
                .fileSizeBytes(1024L * 1024L)
                .width(1920)
                .height(1080)
                .durationSeconds(45)
                .format("mp4")
                .build();

        when(cloudinaryStorageService.uploadVideo(any())).thenReturn(uploadResult);

        ChatMessage savedMsg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userA)
                .messageType(ChatMessageType.VIDEO)
                .textContent("Check out this clip")
                .mediaUrl(uploadResult.getMediaUrl())
                .mediaPublicId(uploadResult.getPublicId())
                .thumbnailUrl(uploadResult.getThumbnailUrl())
                .mediaWidth(1920)
                .mediaHeight(1080)
                .mediaDuration(45.0)
                .mediaFormat("mp4")
                .mediaBytes(1024L * 1024L)
                .originalFileName("vacation.mp4")
                .createdAt(Instant.now())
                .build();
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(savedMsg);

        ChatMessageDto result = chatMessageService.sendVideoMessage(groupA.getId(), file, "Check out this clip", null, null, userA.getId());

        assertNotNull(result);
        assertEquals(ChatMessageType.VIDEO, result.getMessageType());
        assertEquals("vacation.mp4", result.getOriginalFileName());
        assertEquals(45.0, result.getMediaDuration());
        assertEquals("Check out this clip", result.getTextContent());
        verify(chatRealtimeEventPublisher, times(1)).publishMessageCreated(eq(groupA.getId()), any(ChatMessageDto.class));
    }

    @Test
    @DisplayName("34. Video upload by non-member rejected")
    void testSendVideoMessage_NonMember_ThrowsForbidden() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userC.getId())).thenReturn(false);

        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "clip.mp4", "video/mp4", "content".getBytes()
        );

        assertThrows(ForbiddenException.class, () ->
                chatMessageService.sendVideoMessage(groupA.getId(), file, "caption", null, null, userC.getId())
        );
    }

    @Test
    @DisplayName("35. Video upload database failure triggers Cloudinary orphan cleanup")
    void testSendVideoMessage_DbError_TriggersOrphanCleanup() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));

        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "clip.mp4", "video/mp4", "content".getBytes()
        );

        com.memoryverse.dto.response.UploadedMediaResult uploadResult = com.memoryverse.dto.response.UploadedMediaResult.builder()
                .mediaUrl("https://res.cloudinary.com/demo/video/upload/clip.mp4")
                .publicId("orphan_video_pub_id")
                .fileName("clip.mp4")
                .build();

        when(cloudinaryStorageService.uploadVideo(any())).thenReturn(uploadResult);
        when(chatMessageRepository.save(any(ChatMessage.class))).thenThrow(new RuntimeException("DB Connection Timeout"));

        assertThrows(RuntimeException.class, () ->
                chatMessageService.sendVideoMessage(groupA.getId(), file, "caption", null, null, userA.getId())
        );

        verify(cloudinaryStorageService, times(1)).deleteResource(eq("orphan_video_pub_id"), eq("video"));
    }

    @Test
    @DisplayName("36. Valid document upload succeeds and persists filename")
    void testSendFileMessage_Success() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));

        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "annual_report.pdf", "application/pdf", "fake-pdf-content".getBytes()
        );

        com.memoryverse.dto.response.UploadedMediaResult uploadResult = com.memoryverse.dto.response.UploadedMediaResult.builder()
                .mediaUrl("https://res.cloudinary.com/demo/raw/upload/annual_report.pdf")
                .publicId("memoryverse/groups/documents/annual_report_123")
                .fileName("annual_report.pdf")
                .fileSizeBytes(500000L)
                .format("pdf")
                .build();

        when(cloudinaryStorageService.uploadDocument(any())).thenReturn(uploadResult);

        ChatMessage savedMsg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userA)
                .messageType(ChatMessageType.FILE)
                .textContent("Here is the annual report")
                .mediaUrl(uploadResult.getMediaUrl())
                .mediaPublicId(uploadResult.getPublicId())
                .mediaFormat("pdf")
                .mediaBytes(500000L)
                .originalFileName("annual_report.pdf")
                .createdAt(Instant.now())
                .build();
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(savedMsg);

        ChatMessageDto result = chatMessageService.sendFileMessage(groupA.getId(), file, "Here is the annual report", null, null, userA.getId());

        assertNotNull(result);
        assertEquals(ChatMessageType.FILE, result.getMessageType());
        assertEquals("annual_report.pdf", result.getOriginalFileName());
        assertEquals("pdf", result.getMediaFormat());
        verify(chatRealtimeEventPublisher, times(1)).publishMessageCreated(eq(groupA.getId()), any(ChatMessageDto.class));
    }

    @Test
    @DisplayName("37. Document upload database failure triggers Cloudinary raw orphan cleanup")
    void testSendFileMessage_DbError_TriggersOrphanCleanup() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));

        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "doc.pdf", "application/pdf", "content".getBytes()
        );

        com.memoryverse.dto.response.UploadedMediaResult uploadResult = com.memoryverse.dto.response.UploadedMediaResult.builder()
                .mediaUrl("https://res.cloudinary.com/demo/raw/upload/doc.pdf")
                .publicId("orphan_doc_pub_id")
                .fileName("doc.pdf")
                .build();

        when(cloudinaryStorageService.uploadDocument(any())).thenReturn(uploadResult);
        when(chatMessageRepository.save(any(ChatMessage.class))).thenThrow(new RuntimeException("Disk full"));

        assertThrows(RuntimeException.class, () ->
                chatMessageService.sendFileMessage(groupA.getId(), file, "doc", null, null, userA.getId())
        );

        verify(cloudinaryStorageService, times(1)).deleteResource(eq("orphan_doc_pub_id"), eq("raw"));
    }

    @Test
    @DisplayName("38. Soft-deleted attachment hides media details and filename")
    void testDeleteAttachmentMessage_HidesMediaDetails() {
        UUID msgId = UUID.randomUUID();
        ChatMessage msg = ChatMessage.builder()
                .id(msgId)
                .chatGroup(groupA)
                .sender(userA)
                .messageType(ChatMessageType.VIDEO)
                .textContent("Secret video")
                .mediaUrl("https://res.cloudinary.com/demo/video/upload/secret.mp4")
                .originalFileName("secret.mp4")
                .mediaDuration(120.0)
                .deleted(false)
                .build();

        when(chatMessageRepository.findById(msgId)).thenReturn(Optional.of(msg));

        chatMessageService.deleteMessage(msgId, userA.getId());

        assertTrue(msg.isDeleted());
        assertNotNull(msg.getDeletedAt());

        ChatMessageDto dto = ChatMessageDto.fromEntity(msg);
        assertEquals("This message was deleted", dto.getTextContent());
        assertNull(dto.getMediaUrl());
        assertNull(dto.getOriginalFileName());
        assertNull(dto.getMediaDuration());
    }

    @Test
    @DisplayName("39. Search group messages returns matches for text and filename")
    void testSearchGroupMessages_MatchesFilename() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);

        ChatMessage match = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userB)
                .messageType(ChatMessageType.FILE)
                .textContent("Here is the file")
                .originalFileName("budget_2026.xlsx")
                .mediaUrl("https://res.cloudinary.com/raw/budget.xlsx")
                .createdAt(Instant.now())
                .build();

        when(chatMessageRepository.searchGroupMessages(eq(groupA.getId()), eq("budget"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(match)));

        PagedResponse<com.memoryverse.dto.response.ChatMessageSearchResultDto> response =
                chatMessageService.searchGroupMessages(groupA.getId(), "budget", 0, 20, userA.getId());

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("Here is the file", response.getContent().get(0).getContentPreview());
    }

    @Test
    @DisplayName("40. Get group files returns document items")
    void testGetGroupFiles_ReturnsDocuments() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);

        ChatMessage doc = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userB)
                .messageType(ChatMessageType.FILE)
                .originalFileName("specs.pdf")
                .mediaFormat("pdf")
                .mediaUrl("https://res.cloudinary.com/raw/specs.pdf")
                .createdAt(Instant.now())
                .build();

        when(chatMessageRepository.findGroupFileMessages(eq(groupA.getId()), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(doc)));

        PagedResponse<com.memoryverse.dto.response.ChatMediaItemDto> response =
                chatMessageService.getGroupFiles(groupA.getId(), 0, 30, userA.getId());

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("specs.pdf", response.getContent().get(0).getOriginalFileName());
    }

    @Test
    @DisplayName("41. Send message with concurrent DataIntegrityViolationException resolves to existing duplicate")
    void testSendMessage_ConcurrentDataIntegrityViolation_ResolvesToExistingDuplicate() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));

        ChatMessage existing = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userA)
                .messageType(ChatMessageType.TEXT)
                .textContent("Idempotent text")
                .clientMessageId("client-req-999")
                .createdAt(Instant.now())
                .build();

        // 1. Initial check returns empty (simulating two threads passing application check at same millisecond)
        when(chatMessageRepository.findByChatGroupIdAndSenderIdAndClientMessageId(groupA.getId(), userA.getId(), "client-req-999"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(existing));

        // 2. Save throws DataIntegrityViolationException because concurrent thread won DB insertion
        when(chatMessageRepository.save(any(ChatMessage.class)))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException("Duplicate key violation"));

        ChatMessageSendDto dto = new ChatMessageSendDto();
        dto.setChatGroupId(groupA.getId());
        dto.setTextContent("Idempotent text");
        dto.setClientMessageId("client-req-999");

        ChatMessageDto result = chatMessageService.sendMessage(dto, userA.getId());

        assertNotNull(result);
        assertEquals(existing.getId(), result.getId());
        assertEquals("Idempotent text", result.getTextContent());
    }

    @Test
    @DisplayName("42. Mark messages as read rejects backwards timestamp (monotonic guard)")
    void testMarkMessagesAsRead_MonotonicGuard_IgnoresStalePastTimestamp() {
        Instant past = Instant.now().minusSeconds(3600);
        Instant now = Instant.now();

        ChatGroupMember member = ChatGroupMember.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .user(userA)
                .lastReadAt(now)
                .build();

        ChatMessage oldMessage = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userB)
                .createdAt(past)
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(groupA.getId(), userA.getId()))
                .thenReturn(Optional.of(member));
        when(chatMessageRepository.findById(oldMessage.getId()))
                .thenReturn(Optional.of(oldMessage));

        chatMessageService.markMessagesAsRead(groupA.getId(), oldMessage.getId(), userA.getId());

        // Verify member lastReadAt was NOT modified to the past
        assertEquals(now, member.getLastReadAt());
        verify(chatGroupMemberRepository, never()).save(member);
    }

    @Test
    @DisplayName("43. Mark messages as read advances forward on newer message timestamp")
    void testMarkMessagesAsRead_MonotonicGuard_AdvancesOnNewerTimestamp() {
        Instant past = Instant.now().minusSeconds(3600);
        Instant newer = Instant.now();

        ChatGroupMember member = ChatGroupMember.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .user(userA)
                .lastReadAt(past)
                .build();

        ChatMessage newMessage = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userB)
                .createdAt(newer)
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(groupA.getId(), userA.getId()))
                .thenReturn(Optional.of(member));
        when(chatMessageRepository.findById(newMessage.getId()))
                .thenReturn(Optional.of(newMessage));

        chatMessageService.markMessagesAsRead(groupA.getId(), newMessage.getId(), userA.getId());

        // Verify member was saved with updated pointer
        assertEquals(newer, member.getLastReadAt());
        assertEquals(newMessage.getId(), member.getLastReadMessageId());
        verify(chatGroupMemberRepository).save(member);
    }

    @Test
    @DisplayName("44. Member can obtain short-lived signed URL for valid group document")
    void testGetDocumentSignedUrl_Success() {
        ChatMessage docMessage = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userB)
                .messageType(ChatMessageType.FILE)
                .originalFileName("report_2026.pdf")
                .mediaFormat("pdf")
                .mediaPublicId("memoryverse/groups/documents/doc_123")
                .mediaUrl("https://res.cloudinary.com/raw/doc_123.pdf")
                .deleted(false)
                .createdAt(Instant.now())
                .build();

        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatMessageRepository.findById(docMessage.getId())).thenReturn(Optional.of(docMessage));
        when(cloudinaryStorageService.generateSignedDocumentUrl(eq("memoryverse/groups/documents/doc_123"), eq("pdf"), anyInt()))
                .thenReturn("https://api.cloudinary.com/v1_1/demo/download?signature=abc123signed");

        com.memoryverse.dto.response.SignedDocumentUrlResponseDto response =
                chatMessageService.getDocumentSignedUrl(groupA.getId(), docMessage.getId(), userA.getId());

        assertNotNull(response);
        assertEquals(docMessage.getId(), response.getMessageId());
        assertEquals("report_2026.pdf", response.getFileName());
        assertEquals("https://api.cloudinary.com/v1_1/demo/download?signature=abc123signed", response.getUrl());
        assertNotNull(response.getExpiresAt());
    }

    @Test
    @DisplayName("45. Non-member cannot obtain signed document URL (ForbiddenException)")
    void testGetDocumentSignedUrl_NonMember_Forbidden() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userC.getId())).thenReturn(false);

        assertThrows(ForbiddenException.class, () ->
                chatMessageService.getDocumentSignedUrl(groupA.getId(), UUID.randomUUID(), userC.getId())
        );
    }

    @Test
    @DisplayName("46. Deleted document message cannot obtain signed URL (BusinessValidationException)")
    void testGetDocumentSignedUrl_DeletedMessage_Rejected() {
        ChatMessage deletedDoc = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userB)
                .messageType(ChatMessageType.FILE)
                .originalFileName("private.pdf")
                .mediaUrl("https://res.cloudinary.com/raw/private.pdf")
                .deleted(true)
                .build();

        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatMessageRepository.findById(deletedDoc.getId())).thenReturn(Optional.of(deletedDoc));

        assertThrows(BusinessValidationException.class, () ->
                chatMessageService.getDocumentSignedUrl(groupA.getId(), deletedDoc.getId(), userA.getId())
        );
    }

    @Test
    @DisplayName("47. Document from another group is rejected (ForbiddenException)")
    void testGetDocumentSignedUrl_CrossGroupMismatch_Forbidden() {
        ChatMessage otherGroupDoc = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupB)
                .sender(userC)
                .messageType(ChatMessageType.FILE)
                .mediaUrl("https://res.cloudinary.com/raw/other.pdf")
                .deleted(false)
                .build();

        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatMessageRepository.findById(otherGroupDoc.getId())).thenReturn(Optional.of(otherGroupDoc));

        assertThrows(ForbiddenException.class, () ->
                chatMessageService.getDocumentSignedUrl(groupA.getId(), otherGroupDoc.getId(), userA.getId())
        );
    }

    @Test
    @DisplayName("48. Non-file message type rejected for document signed URL")
    void testGetDocumentSignedUrl_NonFileMessageType_Rejected() {
        ChatMessage textMsg = ChatMessage.builder()
                .id(UUID.randomUUID())
                .chatGroup(groupA)
                .sender(userB)
                .messageType(ChatMessageType.TEXT)
                .textContent("Hello world")
                .deleted(false)
                .build();

        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupA.getId(), userA.getId())).thenReturn(true);
        when(chatMessageRepository.findById(textMsg.getId())).thenReturn(Optional.of(textMsg));

        assertThrows(BusinessValidationException.class, () ->
                chatMessageService.getDocumentSignedUrl(groupA.getId(), textMsg.getId(), userA.getId())
        );
    }
}
