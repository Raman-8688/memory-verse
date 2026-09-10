package com.memoryverse.service;

import com.memoryverse.dto.request.ChatGroupCreateDto;
import com.memoryverse.dto.request.ChatGroupUpdateDto;
import com.memoryverse.dto.request.ChatMemberAddDto;
import com.memoryverse.dto.response.ChatGroupDetailDto;
import com.memoryverse.dto.response.ChatGroupMemberDto;
import com.memoryverse.dto.response.ChatGroupSummaryDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.entity.ChatGroup;
import com.memoryverse.entity.ChatGroupMember;
import com.memoryverse.entity.ChatGroupRole;
import com.memoryverse.entity.User;
import com.memoryverse.exception.BusinessValidationException;
import com.memoryverse.exception.ForbiddenException;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.repository.ChatGroupMemberRepository;
import com.memoryverse.repository.ChatGroupRepository;
import com.memoryverse.repository.ChatMessageRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.service.impl.ChatGroupServiceImpl;
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
class ChatGroupServiceTest {

    @Mock
    private ChatGroupRepository chatGroupRepository;

    @Mock
    private ChatGroupMemberRepository chatGroupMemberRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private com.memoryverse.integration.storage.CloudinaryStorageService cloudinaryStorageService;

    @Mock
    private com.memoryverse.service.NotificationService notificationService;

    @Mock
    private ChatRealtimeEventPublisher chatRealtimeEventPublisher;

    @InjectMocks
    private ChatGroupServiceImpl chatGroupService;

    private User userA;
    private User userB;
    private User userC;
    private ChatGroup group;

    @BeforeEach
    void setUp() {
        userA = User.builder()
                .id(UUID.randomUUID())
                .email("usera@test.com")
                .fullName("User A")
                .build();

        userB = User.builder()
                .id(UUID.randomUUID())
                .email("userb@test.com")
                .fullName("User B")
                .build();

        userC = User.builder()
                .id(UUID.randomUUID())
                .email("userc@test.com")
                .fullName("User C")
                .build();

        group = ChatGroup.builder()
                .id(UUID.randomUUID())
                .name("Family Group")
                .description("Family discussions")
                .createdBy(userA)
                .archived(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .members(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("1. Authenticated user can create group and becomes ADMIN")
    void testCreateGroup_CreatorBecomesAdmin() {
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));
        when(userRepository.findById(userB.getId())).thenReturn(Optional.of(userB));
        when(chatGroupRepository.save(any(ChatGroup.class))).thenAnswer(invocation -> {
            ChatGroup g = invocation.getArgument(0);
            g.setId(UUID.randomUUID());
            return g;
        });

        ChatGroupCreateDto createDto = ChatGroupCreateDto.builder()
                .name("New Group")
                .description("Group description")
                .memberUserIds(List.of(userB.getId()))
                .build();

        ChatGroupDetailDto result = chatGroupService.createGroup(createDto, userA.getId());

        assertNotNull(result);
        assertEquals("New Group", result.getName());
        verify(chatGroupMemberRepository, times(2)).save(any(ChatGroupMember.class));
        verify(chatGroupRepository).save(any(ChatGroup.class));
    }

    @Test
    @DisplayName("2. Member can retrieve their group detail")
    void testGetGroupDetail_MemberSuccess() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(group.getId(), userA.getId())).thenReturn(true);
        when(chatGroupRepository.findWithCreatorById(group.getId())).thenReturn(Optional.of(group));

        ChatGroupDetailDto detail = chatGroupService.getGroupDetail(group.getId(), userA.getId());

        assertNotNull(detail);
        assertEquals("Family Group", detail.getName());
    }

    @Test
    @DisplayName("3. Non-member cannot retrieve group (ForbiddenException)")
    void testGetGroupDetail_NonMemberForbidden() {
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(group.getId(), userC.getId())).thenReturn(false);

        assertThrows(ForbiddenException.class, () ->
                chatGroupService.getGroupDetail(group.getId(), userC.getId())
        );
    }

    @Test
    @DisplayName("4. Member can retrieve group members list")
    void testGetGroupMembers_MemberSuccess() {
        ChatGroupMember memberA = ChatGroupMember.builder()
                .id(UUID.randomUUID())
                .chatGroup(group)
                .user(userA)
                .role(ChatGroupRole.ADMIN)
                .joinedAt(Instant.now())
                .build();

        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(group.getId(), userA.getId())).thenReturn(true);
        when(chatGroupMemberRepository.findAllByChatGroupId(group.getId())).thenReturn(List.of(memberA));

        List<ChatGroupMemberDto> members = chatGroupService.getGroupMembers(group.getId(), userA.getId());

        assertNotNull(members);
        assertEquals(1, members.size());
        assertEquals("User A", members.get(0).getUser().getFullName());
    }

    @Test
    @DisplayName("5. Regular member cannot update group (ForbiddenException)")
    void testUpdateGroup_RegularMemberForbidden() {
        ChatGroupMember memberB = ChatGroupMember.builder()
                .id(UUID.randomUUID())
                .chatGroup(group)
                .user(userB)
                .role(ChatGroupRole.MEMBER)
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), userB.getId()))
                .thenReturn(Optional.of(memberB));

        ChatGroupUpdateDto updateDto = ChatGroupUpdateDto.builder().name("Changed Name").build();

        assertThrows(ForbiddenException.class, () ->
                chatGroupService.updateGroup(group.getId(), updateDto, userB.getId())
        );
    }

    @Test
    @DisplayName("6. Admin can update group metadata successfully")
    void testUpdateGroup_AdminSuccess() {
        ChatGroupMember adminMember = ChatGroupMember.builder()
                .id(UUID.randomUUID())
                .chatGroup(group)
                .user(userA)
                .role(ChatGroupRole.ADMIN)
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), userA.getId()))
                .thenReturn(Optional.of(adminMember));
        when(chatGroupRepository.findById(group.getId())).thenReturn(Optional.of(group));
        when(chatGroupRepository.save(any(ChatGroup.class))).thenReturn(group);

        ChatGroupUpdateDto updateDto = ChatGroupUpdateDto.builder().name("Updated Family").build();
        ChatGroupDetailDto updated = chatGroupService.updateGroup(group.getId(), updateDto, userA.getId());

        assertNotNull(updated);
        assertEquals("Updated Family", group.getName());
    }

    @Test
    @DisplayName("7. Admin can add a new member, duplicate member throws BusinessValidationException")
    void testAddMember_DuplicateThrows() {
        ChatGroupMember adminMember = ChatGroupMember.builder()
                .id(UUID.randomUUID())
                .chatGroup(group)
                .user(userA)
                .role(ChatGroupRole.ADMIN)
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), userA.getId()))
                .thenReturn(Optional.of(adminMember));
        when(chatGroupRepository.findById(group.getId())).thenReturn(Optional.of(group));
        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(group.getId(), userB.getId())).thenReturn(true);

        ChatMemberAddDto addDto = ChatMemberAddDto.builder().userId(userB.getId()).build();

        assertThrows(BusinessValidationException.class, () ->
                chatGroupService.addMember(group.getId(), addDto, userA.getId())
        );
    }

    @Test
    @DisplayName("8. User groups query returns paginated list of user's groups")
    void testGetUserGroups_Pagination() {
        when(chatGroupRepository.findUserGroups(eq(userA.getId()), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(group)));
        when(chatGroupMemberRepository.countMembersByGroupIds(List.of(group.getId())))
                .thenReturn(List.<Object[]>of(new Object[]{group.getId(), 1L}));
        when(chatGroupMemberRepository.findByChatGroupIdInAndUserId(List.of(group.getId()), userA.getId()))
                .thenReturn(List.of(ChatGroupMember.builder().chatGroup(group).user(userA).lastReadAt(Instant.now()).build()));
        when(chatMessageRepository.findLatestMessagesInGroups(List.of(group.getId())))
                .thenReturn(List.of());
        when(chatMessageRepository.countUnreadMessages(eq(group.getId()), any(Instant.class), eq(userA.getId())))
                .thenReturn(0L);

        PagedResponse<ChatGroupSummaryDto> response = chatGroupService.getUserGroups(userA.getId(), 0, 20);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("Family Group", response.getContent().get(0).getName());
    }

    @Test
    @DisplayName("9. Admin can upload group avatar, persists and broadcasts GROUP_UPDATED")
    void testUploadGroupAvatar_AdminSuccess() {
        ChatGroupMember adminMember = ChatGroupMember.builder()
                .chatGroup(group)
                .user(userA)
                .role(ChatGroupRole.ADMIN)
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), userA.getId()))
                .thenReturn(Optional.of(adminMember));
        when(chatGroupRepository.findById(group.getId())).thenReturn(Optional.of(group));

        org.springframework.mock.web.MockMultipartFile avatarFile = new org.springframework.mock.web.MockMultipartFile(
                "file", "avatar.jpg", "image/jpeg", new byte[]{1, 2, 3}
        );

        com.memoryverse.dto.response.UploadedMediaResult uploadResult = com.memoryverse.dto.response.UploadedMediaResult.builder()
                .mediaUrl("https://res.cloudinary.com/demo/image/upload/avatar.jpg")
                .publicId("group_avatar_123")
                .build();

        when(cloudinaryStorageService.uploadFile(any())).thenReturn(uploadResult);
        when(chatGroupRepository.save(any(ChatGroup.class))).thenReturn(group);
        when(chatMessageRepository.countGroupMedia(group.getId())).thenReturn(5L);

        ChatGroupDetailDto result = chatGroupService.uploadGroupAvatar(group.getId(), avatarFile, userA.getId());

        assertNotNull(result);
        assertEquals("https://res.cloudinary.com/demo/image/upload/avatar.jpg", group.getAvatarUrl());
        assertEquals("group_avatar_123", group.getAvatarPublicId());
        verify(chatRealtimeEventPublisher).publishGroupUpdated(eq(group.getId()), any(ChatGroupDetailDto.class));
    }

    @Test
    @DisplayName("10. Non-admin cannot upload group avatar (ForbiddenException)")
    void testUploadGroupAvatar_NonAdminForbidden() {
        ChatGroupMember regularMember = ChatGroupMember.builder()
                .chatGroup(group)
                .user(userB)
                .role(ChatGroupRole.MEMBER)
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), userB.getId()))
                .thenReturn(Optional.of(regularMember));

        org.springframework.mock.web.MockMultipartFile avatarFile = new org.springframework.mock.web.MockMultipartFile(
                "file", "avatar.jpg", "image/jpeg", new byte[]{1, 2, 3}
        );

        assertThrows(ForbiddenException.class, () ->
                chatGroupService.uploadGroupAvatar(group.getId(), avatarFile, userB.getId())
        );
    }

    @Test
    @DisplayName("11. Admin can promote member to ADMIN and broadcasts MEMBER_ROLE_CHANGED")
    void testUpdateMemberRole_PromoteSuccess() {
        ChatGroupMember adminMember = ChatGroupMember.builder()
                .chatGroup(group)
                .user(userA)
                .role(ChatGroupRole.ADMIN)
                .build();

        ChatGroupMember targetMember = ChatGroupMember.builder()
                .chatGroup(group)
                .user(userB)
                .role(ChatGroupRole.MEMBER)
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), userA.getId()))
                .thenReturn(Optional.of(adminMember));
        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), userB.getId()))
                .thenReturn(Optional.of(targetMember));

        chatGroupService.updateMemberRole(group.getId(), userB.getId(), ChatGroupRole.ADMIN, userA.getId());

        assertEquals(ChatGroupRole.ADMIN, targetMember.getRole());
        verify(chatGroupMemberRepository).save(targetMember);
        verify(chatRealtimeEventPublisher).publishMemberRoleChanged(eq(group.getId()), eq(userB.getId()), eq("ADMIN"));
    }

    @Test
    @DisplayName("12. Demoting sole group admin throws BusinessValidationException")
    void testUpdateMemberRole_SoleAdminDemoteThrows() {
        ChatGroupMember adminMember = ChatGroupMember.builder()
                .chatGroup(group)
                .user(userA)
                .role(ChatGroupRole.ADMIN)
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), userA.getId()))
                .thenReturn(Optional.of(adminMember));
        when(chatGroupMemberRepository.findAllByChatGroupId(group.getId()))
                .thenReturn(List.of(adminMember));

        assertThrows(BusinessValidationException.class, () ->
                chatGroupService.updateMemberRole(group.getId(), userA.getId(), ChatGroupRole.MEMBER, userA.getId())
        );
    }

    @Test
    @DisplayName("13. Admin can remove member and broadcasts MEMBER_REMOVED")
    void testRemoveMember_AdminSuccess() {
        ChatGroupMember adminMember = ChatGroupMember.builder()
                .chatGroup(group)
                .user(userA)
                .role(ChatGroupRole.ADMIN)
                .build();

        when(chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), userA.getId()))
                .thenReturn(Optional.of(adminMember));

        chatGroupService.removeMember(group.getId(), userB.getId(), userA.getId());

        verify(chatGroupMemberRepository).deleteByChatGroupIdAndUserId(group.getId(), userB.getId());
        verify(chatRealtimeEventPublisher).publishMemberRemoved(eq(group.getId()), eq(userB.getId()));
    }

    @Test
    @DisplayName("14. Search user groups uses batch summary mapping")
    void testSearchUserGroups_BatchSummary() {
        when(chatGroupRepository.searchUserGroups(eq(userA.getId()), eq("Family"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(group)));
        when(chatGroupMemberRepository.countMembersByGroupIds(List.of(group.getId())))
                .thenReturn(List.<Object[]>of(new Object[]{group.getId(), 2L}));
        when(chatGroupMemberRepository.findByChatGroupIdInAndUserId(List.of(group.getId()), userA.getId()))
                .thenReturn(List.of(ChatGroupMember.builder().chatGroup(group).user(userA).lastReadAt(Instant.now()).build()));
        when(chatMessageRepository.findLatestMessagesInGroups(List.of(group.getId())))
                .thenReturn(List.of());
        when(chatMessageRepository.countUnreadMessages(eq(group.getId()), any(Instant.class), eq(userA.getId())))
                .thenReturn(0L);

        PagedResponse<ChatGroupSummaryDto> response = chatGroupService.searchUserGroups(userA.getId(), "Family", 0, 20);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("Family Group", response.getContent().get(0).getName());
        assertEquals(2L, response.getContent().get(0).getMemberCount());
    }
}
