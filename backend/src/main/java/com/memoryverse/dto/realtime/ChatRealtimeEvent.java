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
public class ChatRealtimeEvent<T> {
    private ChatRealtimeEventType eventType;
    private UUID groupId;
    private T payload;
    private Instant timestamp;

    public static <T> ChatRealtimeEvent<T> of(ChatRealtimeEventType type, UUID groupId, T payload) {
        return ChatRealtimeEvent.<T>builder()
                .eventType(type)
                .groupId(groupId)
                .payload(payload)
                .timestamp(Instant.now())
                .build();
    }
}
