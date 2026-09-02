package com.memoryverse.dto.response;

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
public class AiChatResponseDto {

    private String conversationId;

    /**
     * Mode: "MEMORY" or "GENERAL"
     */
    private String mode;

    /**
     * Natural language answer synthesized by the LLM
     */
    private String answer;

    /**
     * Related structured memories matching the user inquiry
     */
    @Builder.Default
    private List<RelatedMemoryDto> relatedMemories = new ArrayList<>();

    /**
     * Related media assets (photos/videos) linked to the retrieved memories
     */
    @Builder.Default
    private List<RelatedMediaDto> relatedMedia = new ArrayList<>();

    /**
     * Contextual suggested follow-up questions
     */
    @Builder.Default
    private List<String> suggestedQuestions = new ArrayList<>();

    /**
     * Model that produced the completion
     */
    private String modelUsed;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RelatedMemoryDto {
        private UUID id;
        private String title;
        private String story;
        private LocalDate memoryDate;
        private String locationName;
        private String journeyTitle;
        private String sectionTitle;
        private String coverImageUrl;
        private int mediaCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RelatedMediaDto {
        private UUID id;
        private String mediaType;
        private String mediaUrl;
        private String thumbnailUrl;
        private String fileName;
        private Integer durationSeconds;
        private UUID memoryId;
        private String memoryTitle;
    }
}
