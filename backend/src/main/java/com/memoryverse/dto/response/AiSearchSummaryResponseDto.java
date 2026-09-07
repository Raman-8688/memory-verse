package com.memoryverse.dto.response;

import com.memoryverse.dto.request.MemorySearchFilterDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiSearchSummaryResponseDto implements Serializable {

    /**
     * Unique token identifying this active search context for multi-turn follow-ups.
     */
    private String searchToken;

    /**
     * Active structured filters after intent extraction & context merging.
     */
    private MemorySearchFilterDto activeFilters;

    /**
     * Total number of matching memory stories.
     */
    private int matchingMemoryCount;

    /**
     * Total images found across matching memories.
     */
    private int totalImageCount;

    /**
     * Total videos found across matching memories.
     */
    private int totalVideoCount;

    /**
     * Distinct people involved/tagged.
     */
    @Builder.Default
    private List<String> people = new ArrayList<>();

    /**
     * Distinct locations where these memories occurred.
     */
    @Builder.Default
    private List<String> locations = new ArrayList<>();

    /**
     * Concise conversational summary (e.g. "Found 4 memories from Goa last month containing 12 photos.")
     */
    private String conversationalSummary;

    /**
     * Recommended follow-up action chips (e.g. [View 12 Photos], [View 4 Memories]).
     */
    @Builder.Default
    private List<SearchActionChipDto> suggestedActions = new ArrayList<>();
}
