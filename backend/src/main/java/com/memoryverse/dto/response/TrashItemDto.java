package com.memoryverse.dto.response;

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
public class TrashItemDto {
    private UUID id;
    private String type; // "MEMORY" or "JOURNEY"
    private String title;
    private String description;
    private String thumbnailUrl;
    private LocalDate originalDate;
    private Instant deletedAt;
    private String locationName;
}
