package com.memoryverse.controller;

import com.memoryverse.dto.request.ChatGroupCreateDto;
import com.memoryverse.dto.request.ChatGroupUpdateDto;
import com.memoryverse.dto.request.ChatMemberAddDto;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.ChatGroupDetailDto;
import com.memoryverse.dto.response.ChatGroupMemberDto;
import com.memoryverse.dto.response.ChatGroupSummaryDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.ChatGroupService;
import com.memoryverse.service.ChatMessageService;
import com.memoryverse.service.UserPresenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/chat/groups")
@RequiredArgsConstructor
public class ChatGroupController {

    private final ChatGroupService chatGroupService;
    private final ChatMessageService chatMessageService;
    private final UserPresenceService userPresenceService;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<ChatGroupSummaryDto>>> getUserGroups(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        PagedResponse<ChatGroupSummaryDto> groups;
        if (query != null && !query.isBlank()) {
            groups = chatGroupService.searchUserGroups(currentUserId, query.trim(), page, size);
        } else {
            groups = chatGroupService.getUserGroups(currentUserId, page, size);
        }
        return ResponseEntity.ok(ApiResponse.success(groups));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ChatGroupDetailDto>> createGroup(
            @Valid @RequestBody ChatGroupCreateDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        ChatGroupDetailDto created = chatGroupService.createGroup(dto, currentUserId);
        return new ResponseEntity<>(ApiResponse.success("Chat group created successfully", created), HttpStatus.CREATED);
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<ChatGroupDetailDto>> getGroupDetail(
            @PathVariable UUID groupId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        ChatGroupDetailDto detail = chatGroupService.getGroupDetail(groupId, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    @PutMapping("/{groupId}")
    public ResponseEntity<ApiResponse<ChatGroupDetailDto>> updateGroup(
            @PathVariable UUID groupId,
            @Valid @RequestBody ChatGroupUpdateDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        ChatGroupDetailDto updated = chatGroupService.updateGroup(groupId, dto, currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Chat group updated successfully", updated));
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> archiveGroup(
            @PathVariable UUID groupId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        chatGroupService.archiveGroup(groupId, currentUserId);
        return ResponseEntity.ok(ApiResponse.message("Chat group archived successfully"));
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<ApiResponse<List<ChatGroupMemberDto>>> getGroupMembers(
            @PathVariable UUID groupId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        List<ChatGroupMemberDto> members = chatGroupService.getGroupMembers(groupId, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(members));
    }

    @GetMapping("/{groupId}/presence")
    public ResponseEntity<ApiResponse<List<UUID>>> getGroupPresence(
            @PathVariable UUID groupId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        List<ChatGroupMemberDto> members = chatGroupService.getGroupMembers(groupId, currentUserId);
        List<UUID> memberUserIds = members.stream()
                .filter(m -> m.getUser() != null && m.getUser().getId() != null)
                .map(m -> m.getUser().getId())
                .toList();
        List<UUID> onlineUserIds = userPresenceService.getOnlineUserIds(memberUserIds);
        return ResponseEntity.ok(ApiResponse.success(onlineUserIds));
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<ApiResponse<Void>> addMember(
            @PathVariable UUID groupId,
            @Valid @RequestBody ChatMemberAddDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        chatGroupService.addMember(groupId, dto, currentUserId);
        return new ResponseEntity<>(ApiResponse.message("Member added successfully"), HttpStatus.CREATED);
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable UUID groupId,
            @PathVariable UUID userId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        chatGroupService.removeMember(groupId, userId, currentUserId);
        return ResponseEntity.ok(ApiResponse.message("Member removed successfully"));
    }

    @PostMapping(value = "/{groupId}/avatar", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ChatGroupDetailDto>> uploadGroupAvatar(
            @PathVariable UUID groupId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        ChatGroupDetailDto updated = chatGroupService.uploadGroupAvatar(groupId, file, currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Group avatar updated successfully", updated));
    }

    @PatchMapping("/{groupId}/members/{userId}/role")
    public ResponseEntity<ApiResponse<Void>> updateMemberRole(
            @PathVariable UUID groupId,
            @PathVariable UUID userId,
            @Valid @RequestBody com.memoryverse.dto.request.ChatGroupRoleUpdateDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        chatGroupService.updateMemberRole(groupId, userId, dto.getRole(), currentUserId);
        return ResponseEntity.ok(ApiResponse.message("Member role updated successfully"));
    }

    @PostMapping("/{groupId}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveGroup(
            @PathVariable UUID groupId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        chatGroupService.leaveGroup(groupId, currentUserId);
        return ResponseEntity.ok(ApiResponse.message("Left chat group successfully"));
    }

    @PostMapping("/{groupId}/read")
    public ResponseEntity<ApiResponse<Void>> markMessagesAsRead(
            @PathVariable UUID groupId,
            @RequestParam(value = "lastReadMessageId", required = false) UUID lastReadMessageId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        chatMessageService.markMessagesAsRead(groupId, lastReadMessageId, currentUserId);
        return ResponseEntity.ok(ApiResponse.message("Messages marked as read"));
    }
}
