package com.memoryverse.controller;

import com.memoryverse.dto.request.AiChatRequestDto;
import com.memoryverse.dto.request.AiNarrativeRequestDto;
import com.memoryverse.dto.request.AiSearchFetchRequestDto;
import com.memoryverse.dto.request.AiSearchQueryDto;
import com.memoryverse.dto.response.AiChatResponseDto;
import com.memoryverse.dto.response.AiModelInfoDto;
import com.memoryverse.dto.response.AiNarrativeResponseDto;
import com.memoryverse.dto.response.AiSearchRecordsResponseDto;

import com.memoryverse.dto.response.AiSearchSummaryResponseDto;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.AiSearchService;
import com.memoryverse.service.AiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final AiSearchService aiSearchService;

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AiChatResponseDto>> chat(
            @Valid @RequestBody AiChatRequestDto request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        AiChatResponseDto response = aiService.processChat(currentUserId, request);
        return ResponseEntity.ok(ApiResponse.success("AI response generated", response));
    }

    /**
     * AI Narrative Intelligence: Converts rough user notes into an evocative,
     * beautifully written personal memory story (3-4 sentences max).
     */
    @PostMapping("/generate-narrative")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AiNarrativeResponseDto>> generateNarrative(
            @Valid @RequestBody AiNarrativeRequestDto request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        AiNarrativeResponseDto response = aiService.generateNarrative(currentUserId, request);
        return ResponseEntity.ok(ApiResponse.success("Narrative generated successfully", response));
    }


    /**
     * AI Search 2.0 Tier 1: Progressive Disclosure (Metadata & Summary Only).
     * Parses intent, supports relative dates, returns count & conversational summary with action chips.
     */
    @PostMapping("/search/summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AiSearchSummaryResponseDto>> searchSummary(
            @Valid @RequestBody AiSearchQueryDto request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        AiSearchSummaryResponseDto summary = aiSearchService.searchSummary(currentUserId, request);
        return ResponseEntity.ok(ApiResponse.success("Search summary generated", summary));
    }

    /**
     * AI Search 2.0 Tier 2: On-Demand Media & Memory Retrieval.
     * Loads actual memories or gallery media only when user clicks an action chip.
     */
    @PostMapping("/search/fetch-records")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AiSearchRecordsResponseDto>> fetchRecords(
            @Valid @RequestBody AiSearchFetchRequestDto request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        AiSearchRecordsResponseDto records = aiSearchService.fetchRecords(currentUserId, request);
        return ResponseEntity.ok(ApiResponse.success("Records retrieved", records));
    }

    @GetMapping("/suggestions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<String>>> getSuggestions() {
        List<String> suggestions = aiService.getDefaultSuggestions();
        return ResponseEntity.ok(ApiResponse.success(suggestions));
    }

    @GetMapping("/models")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<AiModelInfoDto>>> getModels() {
        List<AiModelInfoDto> models = aiService.getAvailableModels();
        return ResponseEntity.ok(ApiResponse.success(models));
    }
}
