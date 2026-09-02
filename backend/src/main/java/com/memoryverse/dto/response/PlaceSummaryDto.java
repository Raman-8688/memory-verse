package com.memoryverse.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceSummaryDto {

    private String locationName;
    private long memoryCount;
    private LocalDate latestMemoryDate;
    private Double latitude;
    private Double longitude;
    private String coverImageUrl;
}
