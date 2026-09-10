package com.memoryverse.dto.realtime;

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
public class ChatTypingDto {
    private UUID groupId;
    private UUID userId;
    private String displayName;
    private boolean typing;
    private Instant timestamp;
}
