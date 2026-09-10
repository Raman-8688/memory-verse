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
public class ChatMessageReadDto {
    private UUID groupId;
    private UUID userId;
    private UUID lastReadMessageId;
    private Instant readAt;
}
