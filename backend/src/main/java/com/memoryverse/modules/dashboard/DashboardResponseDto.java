package com.memoryverse.modules.dashboard;

import com.memoryverse.modules.journey.JourneyResponseDto;
import com.memoryverse.modules.memory.MemoryResponseDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponseDto {

    private DashboardStatsDto stats;
    private MemoryResponseDto memoryOfTheDay;
    private String memoryOfTheDayContext; // e.g. "On this day in 2022" or "Featured Story"
    @Builder.Default
    private List<TimelineMilestoneDto> timeline = new ArrayList<>();
    @Builder.Default
    private List<MemoryResponseDto> recentMemories = new ArrayList<>();
    @Builder.Default
    private List<JourneyResponseDto> activeJourneys = new ArrayList<>();
}
