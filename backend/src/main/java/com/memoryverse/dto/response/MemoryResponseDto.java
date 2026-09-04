package com.memoryverse.dto.response;

import com.memoryverse.entity.Memory;
import com.memoryverse.entity.PrivacyLevel;
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
public class MemoryResponseDto {

    private UUID id;
    private String title;
    private String story;
    private LocalDate memoryDate;
    private String coverImageUrl;
    private String locationName;
    private Double latitude;
    private Double longitude;
    private Boolean isFeatured;
    private Boolean isFavorite;
    private PrivacyLevel privacyLevel;
    private UUID journeyId;
    private String journeyTitle;
    private UUID sectionId;
    private String sectionTitle;
    private UserDto createdBy;
    @Builder.Default
    private List<MediaResponseDto> mediaList = new ArrayList<>();
    @Builder.Default
    private List<UserDto> taggedUsers = new ArrayList<>();
    private Instant createdAt;

    public static MemoryResponseDto fromEntity(Memory memory) {
        if (memory == null) return null;
        return MemoryResponseDto.builder()
                .id(memory.getId())
                .title(memory.getTitle())
                .story(memory.getStory())
                .memoryDate(memory.getMemoryDate())
                .coverImageUrl(memory.getCoverImageUrl())
                .locationName(memory.getLocationName())
                .latitude(memory.getLatitude())
                .longitude(memory.getLongitude())
                .isFeatured(memory.getIsFeatured())
                .isFavorite(Boolean.TRUE.equals(memory.getIsFavorite()))
                .privacyLevel(memory.getPrivacyLevel() != null ? memory.getPrivacyLevel() : PrivacyLevel.CIRCLE_COMPANIONS)
                .journeyId(memory.getJourney() != null ? memory.getJourney().getId() : null)
                .journeyTitle(memory.getJourney() != null ? memory.getJourney().getTitle() : null)
                .sectionId(memory.getSection() != null ? memory.getSection().getId() : null)
                .sectionTitle(memory.getSection() != null ? memory.getSection().getTitle() : null)
                .createdBy(UserDto.fromEntity(memory.getCreatedBy()))
                .mediaList(memory.getMediaList() != null
                        ? memory.getMediaList().stream().map(MediaResponseDto::fromEntity).collect(Collectors.toList())
                        : new ArrayList<>())
                .taggedUsers(memory.getTaggedUsers() != null
                        ? memory.getTaggedUsers().stream().map(UserDto::fromEntity).collect(Collectors.toList())
                        : new ArrayList<>())
                .createdAt(memory.getCreatedAt())
                .build();
    }
}
