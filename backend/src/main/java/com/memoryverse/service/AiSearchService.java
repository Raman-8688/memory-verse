package com.memoryverse.service;

import com.memoryverse.dto.request.AiSearchFetchRequestDto;
import com.memoryverse.dto.request.AiSearchQueryDto;
import com.memoryverse.dto.response.AiSearchRecordsResponseDto;
import com.memoryverse.dto.response.AiSearchSummaryResponseDto;

import java.util.UUID;

public interface AiSearchService {

    /**
     * Tier 1: Evaluates intent, parses relative dates/entities, merges conversational context,
     * and returns lightweight metadata summary ONLY (zero premature media).
     */
    AiSearchSummaryResponseDto searchSummary(UUID userId, AiSearchQueryDto request);

    /**
     * Tier 2: Fetches actual paginated memories or media gallery items on-demand
     * when explicitly triggered via an action chip.
     */
    AiSearchRecordsResponseDto fetchRecords(UUID userId, AiSearchFetchRequestDto request);
}
