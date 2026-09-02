package com.memoryverse.dto.response;

import com.memoryverse.entity.Media;
import com.memoryverse.entity.MediaType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryItemDto {
    private UUID id;
    private String mediaUrl;
    private String thumbnailUrl;
    private MediaType mediaType;
    private String fileName;
    private Integer width;
    private Integer height;
    private Integer durationSeconds;
    private Integer displayOrder;
    private UUID memoryId;
    private String memoryTitle;
    private LocalDate memoryDate;
    private String locationName;
    private UUID journeyId;
    private String journeyTitle;
    private UUID sectionId;
    private String sectionTitle;
    private UserDto uploader;
    @Builder.Default
    private List<UserDto> taggedUsers = new ArrayList<>();
    private Instant createdAt;

    public static GalleryItemDto fromEntity(Media media) {
        if (media == null) return null;

        var memory = media.getMemory();
        return GalleryItemDto.builder()
                .id(media.getId())
                .mediaUrl(media.getMediaUrl())
                .thumbnailUrl(media.getThumbnailUrl())
                .mediaType(media.getMediaType())
                .fileName(media.getFileName())
                .width(media.getWidth())
                .height(media.getHeight())
                .durationSeconds(media.getDurationSeconds())
                .displayOrder(media.getDisplayOrder())
                .memoryId(memory != null ? memory.getId() : null)
                .memoryTitle(memory != null ? memory.getTitle() : null)
                .memoryDate(memory != null ? memory.getMemoryDate() : null)
                .locationName(memory != null ? memory.getLocationName() : null)
                .journeyId(memory != null && memory.getJourney() != null ? memory.getJourney().getId() : null)
                .journeyTitle(memory != null && memory.getJourney() != null ? memory.getJourney().getTitle() : null)
                .sectionId(memory != null && memory.getSection() != null ? memory.getSection().getId() : null)
                .sectionTitle(memory != null && memory.getSection() != null ? memory.getSection().getTitle() : null)
                .uploader(memory != null && memory.getCreatedBy() != null ? UserDto.fromEntity(memory.getCreatedBy()) : null)
                .taggedUsers(memory != null && memory.getTaggedUsers() != null
                        ? memory.getTaggedUsers().stream().map(UserDto::fromEntity).collect(Collectors.toList())
                        : new ArrayList<>())
                .createdAt(media.getCreatedAt())
                .build();
    }
}
