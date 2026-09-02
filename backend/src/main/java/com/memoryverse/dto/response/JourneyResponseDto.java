package com.memoryverse.dto.response;

import com.memoryverse.entity.Journey;
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
public class JourneyResponseDto {

    private UUID id;
    private String title;
    private String slug;
    private String description;
    private String coverImageUrl;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isActive;
    private Integer displayOrder;
    private UserDto createdBy;
    @Builder.Default
    private List<JourneySectionResponseDto> sections = new ArrayList<>();
    private int memoryCount;
    private Instant createdAt;

    public static JourneyResponseDto fromEntity(Journey journey) {
        if (journey == null) return null;
        return JourneyResponseDto.builder()
                .id(journey.getId())
                .title(journey.getTitle())
                .slug(journey.getSlug())
                .description(journey.getDescription())
                .coverImageUrl(journey.getCoverImageUrl())
                .startDate(journey.getStartDate())
                .endDate(journey.getEndDate())
                .isActive(journey.getIsActive())
                .displayOrder(journey.getDisplayOrder())
                .createdBy(UserDto.fromEntity(journey.getCreatedBy()))
                .sections(journey.getSections() != null
                        ? journey.getSections().stream()
                        .map(JourneySectionResponseDto::fromEntity)
                        .collect(Collectors.toList())
                        : new ArrayList<>())
                .createdAt(journey.getCreatedAt())
                .build();
    }
}
