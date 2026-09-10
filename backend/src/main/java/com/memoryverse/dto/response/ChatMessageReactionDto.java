package com.memoryverse.dto.response;

import com.memoryverse.entity.ChatMessageReaction;
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
public class ChatMessageReactionDto {
    private UUID id;
    private UserDto user;
    private String reactionCode;
    private Instant createdAt;

    public static ChatMessageReactionDto fromEntity(ChatMessageReaction reaction) {
        if (reaction == null) return null;
        return ChatMessageReactionDto.builder()
                .id(reaction.getId())
                .user(UserDto.fromEntity(reaction.getUser()))
                .reactionCode(reaction.getReactionCode())
                .createdAt(reaction.getCreatedAt())
                .build();
    }
}
