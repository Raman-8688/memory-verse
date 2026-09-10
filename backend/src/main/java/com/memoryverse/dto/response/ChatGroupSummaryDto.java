package com.memoryverse.dto.response;

import com.memoryverse.entity.ChatGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroupSummaryDto {
    private UUID id;
    private String name;
    private String description;
    private String avatarUrl;
    private UserDto createdBy;
    private long memberCount;
    private long unreadCount;
    private ChatMessageDto lastMessage;
    private boolean isArchived;
    private Instant createdAt;
    private Instant updatedAt;

    public static ChatGroupSummaryDto fromEntity(ChatGroup group, long memberCount, long unreadCount, ChatMessageDto lastMessage) {
        if (group == null) return null;
        return ChatGroupSummaryDto.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .avatarUrl(group.getAvatarUrl())
                .createdBy(UserDto.fromEntity(group.getCreatedBy()))
                .memberCount(memberCount)
                .unreadCount(unreadCount)
                .lastMessage(lastMessage)
                .isArchived(group.isArchived())
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .build();
    }
}
