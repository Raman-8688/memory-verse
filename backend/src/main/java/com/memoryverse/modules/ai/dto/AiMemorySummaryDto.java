package com.memoryverse.modules.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiMemorySummaryDto {

    private UUID id;
    private String title;
    private String storySummary;
    private LocalDate memoryDate;
    private String locationName;
    private String journeyTitle;
    private String sectionTitle;
    private String createdByName;
    private boolean isFeatured;

    @Builder.Default
    private List<String> taggedFriends = new ArrayList<>();

    private int photoCount;
    private int videoCount;

    @Builder.Default
    private List<AiMediaItemDto> mediaItems = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiMediaItemDto {
        private UUID id;
        private String mediaType;
        private String mediaUrl;
        private String thumbnailUrl;
        private String fileName;
        private Integer durationSeconds;
    }
}
