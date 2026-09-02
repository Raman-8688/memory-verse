package com.memoryverse.dto.response;

import com.memoryverse.entity.MemoryComment;
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
public class CommentResponseDto {

    private UUID id;
    private UUID memoryId;
    private UserDto user;
    private String content;
    private Instant createdAt;
    private Instant updatedAt;

    public static CommentResponseDto fromEntity(MemoryComment comment) {
        if (comment == null) return null;
        return CommentResponseDto.builder()
                .id(comment.getId())
                .memoryId(comment.getMemory().getId())
                .user(UserDto.fromEntity(comment.getUser()))
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
}
