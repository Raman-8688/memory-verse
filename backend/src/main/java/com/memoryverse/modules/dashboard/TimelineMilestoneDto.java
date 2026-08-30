package com.memoryverse.modules.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimelineMilestoneDto {
    private String year;
    private String periodTitle;
    private String description;
    private String coverImageUrl;
    private UUID journeyId;
    private UUID sectionId;
    private LocalDate milestoneDate;
    private long memoryCount;
}
