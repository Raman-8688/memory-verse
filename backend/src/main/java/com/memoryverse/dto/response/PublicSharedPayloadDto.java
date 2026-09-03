package com.memoryverse.dto.response;

import com.memoryverse.entity.SharedResourceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicSharedPayloadDto {
    private SharedResourceType resourceType;
    private String token;
    private Long viewCount;
    private Instant sharedAt;
    private UserDto sharedBy;

    private MemoryResponseDto memory;
    private JourneyResponseDto journey;
}
