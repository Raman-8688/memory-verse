package com.memoryverse.modules.journey;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JourneySectionResponseDto {

    private UUID id;
    private UUID journeyId;
    private String title;
    private String description;
    private Integer displayOrder;
    private LocalDate startDate;
    private LocalDate endDate;
    private String imageUrl;
    private Instant createdAt;

    public static JourneySectionResponseDto fromEntity(JourneySection section) {
        if (section == null) return null;
        return JourneySectionResponseDto.builder()
                .id(section.getId())
                .journeyId(section.getJourney() != null ? section.getJourney().getId() : null)
                .title(section.getTitle())
                .description(section.getDescription())
                .displayOrder(section.getDisplayOrder())
                .startDate(section.getStartDate())
                .endDate(section.getEndDate())
                .imageUrl(section.getImageUrl())
                .createdAt(section.getCreatedAt())
                .build();
    }
}
