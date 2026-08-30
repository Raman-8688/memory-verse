package com.memoryverse.modules.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDto {
    private long totalMemories;
    private long totalPhotos;
    private long totalVideos;
    private long totalJourneys;
    private long totalFriends;
}
