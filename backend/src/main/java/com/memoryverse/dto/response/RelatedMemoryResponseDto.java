package com.memoryverse.dto.response;

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
public class RelatedMemoryResponseDto {

    private UUID id;
    private String title;
    private LocalDate memoryDate;
    private String locationName;
    private String coverImageUrl;
    private String relationReason;
    private int mediaCount;
}
