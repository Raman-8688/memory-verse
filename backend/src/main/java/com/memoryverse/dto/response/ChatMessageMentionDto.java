package com.memoryverse.dto.response;

import com.memoryverse.entity.ChatMessageMention;
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
public class ChatMessageMentionDto {
    private UUID id;
    private UUID messageId;
    private UUID mentionedUserId;
    private String mentionedUserName;
    private Instant createdAt;

    public static ChatMessageMentionDto fromEntity(ChatMessageMention mention) {
        if (mention == null) return null;
        return ChatMessageMentionDto.builder()
                .id(mention.getId())
                .messageId(mention.getMessage() != null ? mention.getMessage().getId() : null)
                .mentionedUserId(mention.getMentionedUser() != null ? mention.getMentionedUser().getId() : null)
                .mentionedUserName(mention.getMentionedUser() != null ? mention.getMentionedUser().getFullName() : null)
                .createdAt(mention.getCreatedAt())
                .build();
    }
}
