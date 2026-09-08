package com.memoryverse.dto.response;

import com.memoryverse.entity.MediaType;
import com.memoryverse.entity.MomentMedia;
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
public class MomentMediaDto {
    private UUID id;
    private String mediaUrl;
    private String thumbnailUrl;
    private MediaType mediaType;
    private Integer displayOrder;
    private Instant createdAt;

    public static MomentMediaDto fromEntity(MomentMedia media) {
        if (media == null) return null;
        return MomentMediaDto.builder()
                .id(media.getId())
                .mediaUrl(media.getMediaUrl())
                .thumbnailUrl(media.getThumbnailUrl())
                .mediaType(media.getMediaType())
                .displayOrder(media.getDisplayOrder())
                .createdAt(media.getCreatedAt())
                .build();
    }
}
