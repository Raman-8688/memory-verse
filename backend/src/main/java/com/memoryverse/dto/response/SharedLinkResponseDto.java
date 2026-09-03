package com.memoryverse.dto.response;

import com.memoryverse.entity.SharedLink;
import com.memoryverse.entity.SharedResourceType;
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
public class SharedLinkResponseDto {
    private UUID id;
    private String token;
    private String shareUrl;
    private SharedResourceType resourceType;
    private UUID resourceId;
    private Long viewCount;
    private Boolean isActive;
    private Instant expiresAt;
    private Instant createdAt;

    public static SharedLinkResponseDto fromEntity(SharedLink link) {
        if (link == null) return null;
        return SharedLinkResponseDto.builder()
                .id(link.getId())
                .token(link.getToken())
                .shareUrl("/s/" + link.getToken())
                .resourceType(link.getResourceType())
                .resourceId(link.getResourceId())
                .viewCount(link.getViewCount())
                .isActive(link.getIsActive())
                .expiresAt(link.getExpiresAt())
                .createdAt(link.getCreatedAt())
                .build();
    }
}
