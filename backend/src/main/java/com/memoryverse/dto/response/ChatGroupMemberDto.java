package com.memoryverse.dto.response;

import com.memoryverse.entity.ChatGroupMember;
import com.memoryverse.entity.ChatGroupRole;
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
public class ChatGroupMemberDto {
    private UUID id;
    private UserDto user;
    private ChatGroupRole role;
    private Instant joinedAt;
    private UUID lastReadMessageId;
    private Instant lastReadAt;

    public static ChatGroupMemberDto fromEntity(ChatGroupMember member) {
        if (member == null) return null;
        return ChatGroupMemberDto.builder()
                .id(member.getId())
                .user(UserDto.fromEntity(member.getUser()))
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .lastReadMessageId(member.getLastReadMessageId())
                .lastReadAt(member.getLastReadAt())
                .build();
    }
}
