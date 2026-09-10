package com.memoryverse.dto.response;

import com.memoryverse.entity.ChatGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroupDetailDto {
    private UUID id;
    private String name;
    private String description;
    private String avatarUrl;
    private String avatarPublicId;
    private UserDto createdBy;
    private List<ChatGroupMemberDto> members;
    private long mediaCount;
    private boolean isArchived;
    private Instant createdAt;
    private Instant updatedAt;

    public static ChatGroupDetailDto fromEntity(ChatGroup group) {
        return fromEntity(group, 0);
    }

    public static ChatGroupDetailDto fromEntity(ChatGroup group, long mediaCount) {
        if (group == null) return null;

        List<ChatGroupMemberDto> memberDtos = (group.getMembers() == null || group.getMembers().isEmpty())
                ? Collections.emptyList()
                : group.getMembers().stream()
                .map(ChatGroupMemberDto::fromEntity)
                .collect(Collectors.toList());

        return ChatGroupDetailDto.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .avatarUrl(group.getAvatarUrl())
                .avatarPublicId(group.getAvatarPublicId())
                .createdBy(UserDto.fromEntity(group.getCreatedBy()))
                .members(memberDtos)
                .mediaCount(mediaCount)
                .isArchived(group.isArchived())
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .build();
    }
}
