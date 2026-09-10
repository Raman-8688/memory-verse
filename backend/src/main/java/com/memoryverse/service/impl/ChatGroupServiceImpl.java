package com.memoryverse.service.impl;

import com.memoryverse.service.ChatGroupService;
import com.memoryverse.dto.request.ChatGroupCreateDto;
import com.memoryverse.dto.request.ChatGroupUpdateDto;
import com.memoryverse.dto.request.ChatMemberAddDto;
import com.memoryverse.dto.response.ChatGroupDetailDto;
import com.memoryverse.dto.response.ChatGroupSummaryDto;
import com.memoryverse.dto.response.ChatMessageDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.entity.ChatGroup;
import com.memoryverse.entity.ChatGroupMember;
import com.memoryverse.entity.ChatGroupRole;
import com.memoryverse.entity.ChatMessage;
import com.memoryverse.entity.User;
import com.memoryverse.exception.BusinessValidationException;
import com.memoryverse.exception.ForbiddenException;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.repository.ChatGroupMemberRepository;
import com.memoryverse.repository.ChatGroupRepository;
import com.memoryverse.repository.ChatMessageRepository;
import com.memoryverse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatGroupServiceImpl implements ChatGroupService {

    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final com.memoryverse.service.NotificationService notificationService;
    private final com.memoryverse.integration.storage.CloudinaryStorageService cloudinaryStorageService;
    private final com.memoryverse.service.ChatRealtimeEventPublisher chatRealtimeEventPublisher;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ChatGroupSummaryDto> getUserGroups(UUID currentUserId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 50);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<ChatGroup> groupPage = chatGroupRepository.findUserGroups(currentUserId, pageable);
        List<ChatGroupSummaryDto> dtos = toSummaryDtos(groupPage.getContent(), currentUserId);

        return PagedResponse.<ChatGroupSummaryDto>builder()
                .content(dtos)
                .page(groupPage.getNumber())
                .size(groupPage.getSize())
                .totalElements(groupPage.getTotalElements())
                .totalPages(groupPage.getTotalPages())
                .last(groupPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ChatGroupSummaryDto> searchUserGroups(UUID currentUserId, String query, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 50);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<ChatGroup> groupPage = chatGroupRepository.searchUserGroups(currentUserId, query != null ? query.trim() : "", pageable);
        List<ChatGroupSummaryDto> dtos = toSummaryDtos(groupPage.getContent(), currentUserId);

        return PagedResponse.<ChatGroupSummaryDto>builder()
                .content(dtos)
                .page(groupPage.getNumber())
                .size(groupPage.getSize())
                .totalElements(groupPage.getTotalElements())
                .totalPages(groupPage.getTotalPages())
                .last(groupPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ChatGroupDetailDto getGroupDetail(UUID groupId, UUID currentUserId) {
        verifyMembership(groupId, currentUserId);
        ChatGroup group = chatGroupRepository.findWithCreatorById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        long mediaCount = chatMessageRepository.countGroupMedia(groupId);
        return ChatGroupDetailDto.fromEntity(group, mediaCount);
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.memoryverse.dto.response.ChatGroupMemberDto> getGroupMembers(UUID groupId, UUID currentUserId) {
        verifyMembership(groupId, currentUserId);
        List<ChatGroupMember> members = chatGroupMemberRepository.findAllByChatGroupId(groupId);
        return members.stream()
                .map(com.memoryverse.dto.response.ChatGroupMemberDto::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public ChatGroupDetailDto createGroup(ChatGroupCreateDto dto, UUID currentUserId) {
        User creator = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + currentUserId));

        ChatGroup group = ChatGroup.builder()
                .name(dto.getName().trim())
                .description(dto.getDescription() != null ? dto.getDescription().trim() : null)
                .avatarUrl(dto.getAvatarUrl())
                .avatarPublicId(dto.getAvatarPublicId())
                .createdBy(creator)
                .archived(false)
                .build();

        ChatGroup savedGroup = chatGroupRepository.save(group);

        ChatGroupMember creatorMember = ChatGroupMember.builder()
                .chatGroup(savedGroup)
                .user(creator)
                .role(ChatGroupRole.ADMIN)
                .build();
        ChatGroupMember savedCreatorMember = chatGroupMemberRepository.save(creatorMember);
        savedGroup.getMembers().add(savedCreatorMember);

        if (dto.getMemberUserIds() != null) {
            for (UUID memberId : dto.getMemberUserIds()) {
                if (memberId.equals(currentUserId)) continue;
                userRepository.findById(memberId).ifPresent(user -> {
                    ChatGroupMember member = ChatGroupMember.builder()
                            .chatGroup(savedGroup)
                            .user(user)
                            .role(ChatGroupRole.MEMBER)
                            .build();
                    ChatGroupMember savedMember = chatGroupMemberRepository.save(member);
                    savedGroup.getMembers().add(savedMember);
                });
            }
        }

        log.info("Created chat group [{}] by user [{}]", savedGroup.getId(), currentUserId);
        return ChatGroupDetailDto.fromEntity(savedGroup, 0);
    }

    @Override
    @Transactional
    public ChatGroupDetailDto updateGroup(UUID groupId, ChatGroupUpdateDto dto, UUID currentUserId) {
        verifyAdmin(groupId, currentUserId);
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        if (dto.getName() != null && !dto.getName().isBlank()) {
            group.setName(dto.getName().trim());
        }
        if (dto.getDescription() != null) {
            group.setDescription(dto.getDescription().trim());
        }
        if (dto.getAvatarUrl() != null) {
            group.setAvatarUrl(dto.getAvatarUrl());
        }
        if (dto.getAvatarPublicId() != null) {
            group.setAvatarPublicId(dto.getAvatarPublicId());
        }

        ChatGroup updated = chatGroupRepository.save(group);
        log.info("Updated chat group [{}] by admin [{}]", groupId, currentUserId);
        long mediaCount = chatMessageRepository.countGroupMedia(groupId);
        ChatGroupDetailDto detail = ChatGroupDetailDto.fromEntity(updated, mediaCount);

        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishGroupUpdated(groupId, detail);
        }

        return detail;
    }

    @Override
    @Transactional
    public ChatGroupDetailDto uploadGroupAvatar(UUID groupId, org.springframework.web.multipart.MultipartFile file, UUID currentUserId) {
        verifyAdmin(groupId, currentUserId);

        if (file == null || file.isEmpty()) {
            throw new BusinessValidationException("Avatar image file cannot be empty");
        }

        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        String oldPublicId = group.getAvatarPublicId();
        com.memoryverse.dto.response.UploadedMediaResult uploadResult = cloudinaryStorageService.uploadFile(file);

        if (uploadResult == null || uploadResult.getMediaUrl() == null) {
            throw new BusinessValidationException("Failed to upload avatar image to storage");
        }

        try {
            group.setAvatarUrl(uploadResult.getMediaUrl());
            group.setAvatarPublicId(uploadResult.getPublicId());
            ChatGroup updated = chatGroupRepository.save(group);

            if (oldPublicId != null && !oldPublicId.isBlank()) {
                try {
                    cloudinaryStorageService.deleteFile(oldPublicId, com.memoryverse.entity.MediaType.IMAGE);
                } catch (Exception ex) {
                    log.warn("Failed to delete previous avatar [{}] from storage: {}", oldPublicId, ex.getMessage());
                }
            }

            long mediaCount = chatMessageRepository.countGroupMedia(groupId);
            ChatGroupDetailDto detail = ChatGroupDetailDto.fromEntity(updated, mediaCount);

            if (chatRealtimeEventPublisher != null) {
                chatRealtimeEventPublisher.publishGroupUpdated(groupId, detail);
            }

            log.info("Uploaded new avatar for group [{}] by admin [{}]", groupId, currentUserId);
            return detail;
        } catch (Exception ex) {
            log.error("Failed to update group avatar in DB for group [{}]. Cleaning up uploaded asset [{}]", groupId, uploadResult.getPublicId());
            try {
                if (uploadResult.getPublicId() != null) {
                    cloudinaryStorageService.deleteFile(uploadResult.getPublicId(), com.memoryverse.entity.MediaType.IMAGE);
                }
            } catch (Exception cleanupEx) {
                log.error("Failed to cleanup orphaned avatar asset [{}]", uploadResult.getPublicId(), cleanupEx);
            }
            throw ex;
        }
    }

    @Override
    @Transactional
    public void addMember(UUID groupId, ChatMemberAddDto dto, UUID currentUserId) {
        verifyAdmin(groupId, currentUserId);

        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        if (dto.getUserId() != null && chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupId, dto.getUserId())) {
            throw new BusinessValidationException("User is already a member of this group");
        }

        User userToAdd;
        if (dto.getUserId() != null) {
            userToAdd = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + dto.getUserId()));
        } else if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            userToAdd = userRepository.findByEmail(dto.getEmail().trim().toLowerCase())
                    .orElseThrow(() -> new ResourceNotFoundException("No user found with email: " + dto.getEmail().trim()));
        } else {
            throw new BusinessValidationException("User ID or Email is required to add member");
        }

        if (chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupId, userToAdd.getId())) {
            throw new BusinessValidationException("User is already a member of this group");
        }

        ChatGroupMember member = ChatGroupMember.builder()
                .chatGroup(group)
                .user(userToAdd)
                .role(dto.getRole() != null ? dto.getRole() : ChatGroupRole.MEMBER)
                .build();

        ChatGroupMember savedMember = chatGroupMemberRepository.save(member);
        log.info("Added user [{}] to chat group [{}] with role [{}]", userToAdd.getId(), groupId, member.getRole());

        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishMemberAdded(groupId, com.memoryverse.dto.response.ChatGroupMemberDto.fromEntity(savedMember));
        }

        User adminUser = userRepository.findById(currentUserId).orElse(null);
        if (notificationService != null && adminUser != null) {
            notificationService.createChatNotification(
                    userToAdd,
                    adminUser,
                    group,
                    null,
                    com.memoryverse.entity.NotificationType.GROUP_MEMBER_ADDED,
                    "Added to " + group.getName(),
                    "You have been added to the discussion group " + group.getName()
            );
        }
    }

    @Override
    @Transactional
    public void removeMember(UUID groupId, UUID memberUserId, UUID currentUserId) {
        verifyAdmin(groupId, currentUserId);

        if (memberUserId.equals(currentUserId)) {
            throw new BusinessValidationException("Use leaveGroup endpoint to leave the group");
        }

        ChatGroup group = chatGroupRepository.findById(groupId).orElse(null);
        User removedUser = userRepository.findById(memberUserId).orElse(null);
        User adminUser = userRepository.findById(currentUserId).orElse(null);

        chatGroupMemberRepository.deleteByChatGroupIdAndUserId(groupId, memberUserId);
        log.info("Removed user [{}] from chat group [{}] by admin [{}]", memberUserId, groupId, currentUserId);

        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishMemberRemoved(groupId, memberUserId);
        }

        if (notificationService != null && removedUser != null && adminUser != null && group != null) {
            notificationService.createChatNotification(
                    removedUser,
                    adminUser,
                    group,
                    null,
                    com.memoryverse.entity.NotificationType.GROUP_MEMBER_REMOVED,
                    "Removed from " + group.getName(),
                    "You were removed from " + group.getName() + " by an admin"
            );
        }
    }

    @Override
    @Transactional
    public void updateMemberRole(UUID groupId, UUID memberUserId, ChatGroupRole newRole, UUID currentUserId) {
        verifyAdmin(groupId, currentUserId);

        if (newRole == null) {
            throw new BusinessValidationException("New role is required");
        }

        ChatGroupMember targetMember = chatGroupMemberRepository.findByChatGroupIdAndUserId(groupId, memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found in this group"));

        if (memberUserId.equals(currentUserId) && newRole != ChatGroupRole.ADMIN) {
            long adminCount = chatGroupMemberRepository.findAllByChatGroupId(groupId).stream()
                    .filter(m -> m.getRole() == ChatGroupRole.ADMIN)
                    .count();
            if (adminCount <= 1) {
                throw new BusinessValidationException("Cannot demote the sole group admin");
            }
        }

        targetMember.setRole(newRole);
        chatGroupMemberRepository.save(targetMember);
        log.info("Updated role of user [{}] to [{}] in group [{}] by admin [{}]", memberUserId, newRole, groupId, currentUserId);

        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishMemberRoleChanged(groupId, memberUserId, newRole.name());
        }

        User adminUser = userRepository.findById(currentUserId).orElse(null);
        ChatGroup group = targetMember.getChatGroup() != null ? targetMember.getChatGroup() : chatGroupRepository.findById(groupId).orElse(null);
        if (notificationService != null && targetMember.getUser() != null && adminUser != null && !memberUserId.equals(currentUserId) && group != null) {
            notificationService.createChatNotification(
                    targetMember.getUser(),
                    adminUser,
                    group,
                    null,
                    com.memoryverse.entity.NotificationType.GROUP_ROLE_CHANGED,
                    "Role updated in " + group.getName(),
                    "Your role in " + group.getName() + " is now " + newRole.name()
            );
        }
    }

    @Override
    @Transactional
    public void leaveGroup(UUID groupId, UUID currentUserId) {
        ChatGroupMember member = chatGroupMemberRepository.findByChatGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new BusinessValidationException("You are not a member of this group"));

        chatGroupMemberRepository.delete(member);
        log.info("User [{}] left chat group [{}]", currentUserId, groupId);

        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishMemberRemoved(groupId, currentUserId);
        }
    }

    @Override
    @Transactional
    public void archiveGroup(UUID groupId, UUID currentUserId) {
        verifyAdmin(groupId, currentUserId);
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        group.setArchived(true);
        chatGroupRepository.save(group);
        log.info("Archived chat group [{}] by admin [{}]", groupId, currentUserId);

        long mediaCount = chatMessageRepository.countGroupMedia(groupId);
        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishGroupUpdated(groupId, ChatGroupDetailDto.fromEntity(group, mediaCount));
        }
    }

    private void verifyMembership(UUID groupId, UUID userId) {
        if (chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupId, userId)) {
            return;
        }

        // Self-healing fallback for creator if group exists
        Optional<ChatGroup> groupOpt = chatGroupRepository.findById(groupId);
        if (groupOpt.isPresent() && groupOpt.get().getCreatedBy() != null && groupOpt.get().getCreatedBy().getId().equals(userId)) {
            ChatGroupMember adminMember = ChatGroupMember.builder()
                    .chatGroup(groupOpt.get())
                    .user(groupOpt.get().getCreatedBy())
                    .role(ChatGroupRole.ADMIN)
                    .build();
            chatGroupMemberRepository.save(adminMember);
            return;
        }

        throw new ForbiddenException("You are not a member of this chat group");
    }

    private void verifyAdmin(UUID groupId, UUID userId) {
        Optional<ChatGroupMember> memberOpt = chatGroupMemberRepository.findByChatGroupIdAndUserId(groupId, userId);
        if (memberOpt.isPresent()) {
            if (memberOpt.get().getRole() == ChatGroupRole.ADMIN) {
                return;
            }
            throw new ForbiddenException("Only group admins can perform this action");
        }

        // Self-healing fallback for creator if group exists
        Optional<ChatGroup> groupOpt = chatGroupRepository.findById(groupId);
        if (groupOpt.isPresent() && groupOpt.get().getCreatedBy() != null && groupOpt.get().getCreatedBy().getId().equals(userId)) {
            ChatGroupMember adminMember = ChatGroupMember.builder()
                    .chatGroup(groupOpt.get())
                    .user(groupOpt.get().getCreatedBy())
                    .role(ChatGroupRole.ADMIN)
                    .build();
            chatGroupMemberRepository.save(adminMember);
            return;
        }

        throw new ForbiddenException("Only group admins can perform this action");
    }

    private List<ChatGroupSummaryDto> toSummaryDtos(List<ChatGroup> groups, UUID currentUserId) {
        if (groups == null || groups.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<UUID> groupIds = groups.stream().map(ChatGroup::getId).toList();

        // 1. Batch member counts
        java.util.Map<UUID, Long> memberCountMap = new java.util.HashMap<>();
        try {
            List<Object[]> memberCounts = chatGroupMemberRepository.countMembersByGroupIds(groupIds);
            if (memberCounts != null) {
                for (Object[] row : memberCounts) {
                    if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                        UUID gId = row[0] instanceof UUID id ? id : UUID.fromString(row[0].toString());
                        long count = row[1] instanceof Number num ? num.longValue() : Long.parseLong(row[1].toString());
                        memberCountMap.put(gId, count);
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to batch count group members: {}", ex.getMessage());
        }

        // 2. Batch user memberships for lastReadAt
        java.util.Map<UUID, Instant> lastReadAtMap = new java.util.HashMap<>();
        try {
            List<ChatGroupMember> userMemberships = chatGroupMemberRepository.findByChatGroupIdInAndUserId(groupIds, currentUserId);
            if (userMemberships != null) {
                for (ChatGroupMember m : userMemberships) {
                    if (m.getChatGroup() != null) {
                        lastReadAtMap.put(m.getChatGroup().getId(), m.getLastReadAt() != null ? m.getLastReadAt() : Instant.EPOCH);
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to batch fetch user memberships: {}", ex.getMessage());
        }

        // 3. Batch latest messages
        java.util.Map<UUID, ChatMessageDto> latestMessageMap = new java.util.HashMap<>();
        try {
            List<ChatMessage> latestMessages = chatMessageRepository.findLatestMessagesInGroups(groupIds);
            if (latestMessages != null) {
                for (ChatMessage msg : latestMessages) {
                    if (msg.getChatGroup() != null) {
                        latestMessageMap.putIfAbsent(msg.getChatGroup().getId(), ChatMessageDto.fromEntity(msg));
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to batch fetch latest messages: {}", ex.getMessage());
        }

        // 4. Assemble DTOs
        return groups.stream().map(group -> {
            long memberCount = memberCountMap.getOrDefault(group.getId(), 0L);
            Instant lastReadAt = lastReadAtMap.getOrDefault(group.getId(), Instant.EPOCH);
            long unreadCount = chatMessageRepository.countUnreadMessages(group.getId(), lastReadAt != null ? lastReadAt : Instant.EPOCH, currentUserId);
            ChatMessageDto lastMessageDto = latestMessageMap.get(group.getId());
            return ChatGroupSummaryDto.fromEntity(group, memberCount, unreadCount, lastMessageDto);
        }).toList();
    }

    private ChatGroupSummaryDto toSummaryDto(ChatGroup group, UUID currentUserId) {
        long memberCount = chatGroupMemberRepository.countByChatGroupId(group.getId());
        Optional<ChatMessage> latestMessageOpt = chatMessageRepository.findLatestMessageInGroup(group.getId());
        ChatMessageDto lastMessageDto = latestMessageOpt.map(ChatMessageDto::fromEntity).orElse(null);

        Optional<ChatGroupMember> memberOpt = chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), currentUserId);
        Instant lastReadAt = memberOpt.map(ChatGroupMember::getLastReadAt).orElse(Instant.EPOCH);
        long unreadCount = chatMessageRepository.countUnreadMessages(group.getId(), lastReadAt != null ? lastReadAt : Instant.EPOCH, currentUserId);

        return ChatGroupSummaryDto.fromEntity(group, memberCount, unreadCount, lastMessageDto);
    }
}
