package com.memoryverse.service;

import com.memoryverse.dto.request.ChatGroupCreateDto;
import com.memoryverse.dto.request.ChatGroupUpdateDto;
import com.memoryverse.dto.request.ChatMemberAddDto;
import com.memoryverse.dto.response.ChatGroupDetailDto;
import com.memoryverse.dto.response.ChatGroupSummaryDto;
import com.memoryverse.dto.response.PagedResponse;

import java.util.UUID;

public interface ChatGroupService {

    PagedResponse<ChatGroupSummaryDto> getUserGroups(UUID currentUserId, int page, int size);

    PagedResponse<ChatGroupSummaryDto> searchUserGroups(UUID currentUserId, String query, int page, int size);

    ChatGroupDetailDto getGroupDetail(UUID groupId, UUID currentUserId);

    java.util.List<com.memoryverse.dto.response.ChatGroupMemberDto> getGroupMembers(UUID groupId, UUID currentUserId);

    ChatGroupDetailDto createGroup(ChatGroupCreateDto dto, UUID currentUserId);

    ChatGroupDetailDto updateGroup(UUID groupId, ChatGroupUpdateDto dto, UUID currentUserId);

    ChatGroupDetailDto uploadGroupAvatar(UUID groupId, org.springframework.web.multipart.MultipartFile file, UUID currentUserId);

    void addMember(UUID groupId, ChatMemberAddDto dto, UUID currentUserId);

    void removeMember(UUID groupId, UUID memberUserId, UUID currentUserId);

    void updateMemberRole(UUID groupId, UUID memberUserId, com.memoryverse.entity.ChatGroupRole newRole, UUID currentUserId);

    void leaveGroup(UUID groupId, UUID currentUserId);

    void archiveGroup(UUID groupId, UUID currentUserId);
}
