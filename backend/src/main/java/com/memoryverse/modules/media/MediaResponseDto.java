package com.memoryverse.modules.media;

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
public class MediaResponseDto {
    private UUID id;
    private String mediaUrl;
    private String thumbnailUrl;
    private MediaType mediaType;
    private String publicId;
    private String fileName;
    private Long fileSizeBytes;
    private Integer width;
    private Integer height;
    private Integer durationSeconds;
    private Integer displayOrder;
    private Instant createdAt;

    public static MediaResponseDto fromEntity(Media media) {
        if (media == null) return null;
        return MediaResponseDto.builder()
                .id(media.getId())
                .mediaUrl(media.getMediaUrl())
                .thumbnailUrl(media.getThumbnailUrl())
                .mediaType(media.getMediaType())
                .publicId(media.getPublicId())
                .fileName(media.getFileName())
                .fileSizeBytes(media.getFileSizeBytes())
                .width(media.getWidth())
                .height(media.getHeight())
                .durationSeconds(media.getDurationSeconds())
                .displayOrder(media.getDisplayOrder())
                .createdAt(media.getCreatedAt())
                .build();
    }
}
