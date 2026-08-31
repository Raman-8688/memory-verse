package com.memoryverse.modules.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memoryverse.modules.ai.dto.AiChatRequestDto;
import com.memoryverse.modules.ai.dto.AiChatResponseDto;
import com.memoryverse.modules.ai.dto.AiMemorySummaryDto;
import com.memoryverse.modules.ai.dto.MemorySearchCriteria;
import com.memoryverse.modules.ai.prompt.AiPromptTemplates;
import com.memoryverse.modules.ai.provider.AiModelProvider;
import com.memoryverse.modules.ai.retrieval.MemoryRetrievalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiOrchestratorService {

    private final AiModelProvider aiModelProvider;
    private final MemoryRetrievalService memoryRetrievalService;
    private final ObjectMapper objectMapper;

    private final BeanOutputConverter<MemorySearchCriteria> criteriaConverter =
            new BeanOutputConverter<>(MemorySearchCriteria.class);

    /**
     * Phase 2: Intent Extraction & Memory Retrieval.
     * Uses Spring AI Structured Output to analyze the prompt, extracts MemorySearchCriteria,
     * queries PostgreSQL via JPA Specifications, and maps results into lightweight DTOs.
     */
    public AiChatResponseDto processChat(UUID userId, AiChatRequestDto request) {
        String conversationId = (request.getConversationId() != null && !request.getConversationId().isBlank())
                ? request.getConversationId()
                : UUID.randomUUID().toString();

        String userMessage = request.getMessage().trim();
        log.info("Processing AI Chat request: userId={}, conversationId='{}', message='{}'",
                userId, conversationId, userMessage);

        // Security check: intercept direct attempts to probe system configurations
        String lower = userMessage.toLowerCase();
        if (lower.contains("password") || lower.contains("jwt_secret") || lower.contains("connection string")
                || lower.contains("database url") || lower.contains("api key") || lower.contains("ignore previous instructions")) {
            return AiChatResponseDto.builder()
                    .conversationId(conversationId)
                    .mode("GENERAL")
                    .answer("I am designed solely to help you explore and preserve your memories, and cannot discuss or disclose internal system configurations or credentials.")
                    .suggestedQuestions(getDefaultSuggestions())
                    .modelUsed(aiModelProvider.getActiveModelName())
                    .build();
        }

        // 1. Structured Intent Extraction via Spring AI
        MemorySearchCriteria criteria = extractSearchCriteria(userMessage);
        log.info("Extracted Search Criteria: mode={}, mediaType={}, keywords={}, journey={}, section={}, dates=[{} to {}]",
                criteria.getMode(), criteria.getMediaType(), criteria.getKeywords(),
                criteria.getJourneyName(), criteria.getSectionName(),
                criteria.getStartDate(), criteria.getEndDate());

        // 2. Dual-Mode Dispatch
        List<AiMemorySummaryDto> retrievedSummaries = new ArrayList<>();
        String mode = "GENERAL";

        if ("MEMORY".equalsIgnoreCase(criteria.getMode())) {
            mode = "MEMORY";
            // Safe, parameterized JPA retrieval against PostgreSQL (strictly zero raw SQL)
            retrievedSummaries = memoryRetrievalService.retrieveMemories(criteria, 10);
        }

        // 3. Response Generation (Grounded response generation refined in Phase 3)
        String answer;
        if ("MEMORY".equals(mode) && !retrievedSummaries.isEmpty()) {
            answer = String.format("Found %d matching %s from your journey records.",
                    retrievedSummaries.size(),
                    retrievedSummaries.size() == 1 ? "memory" : "memories");
        } else if ("MEMORY".equals(mode)) {
            answer = "I couldn't find any memories matching that description in MemoryVerse.";
        } else {
            // General query mode: execute via model provider
            answer = aiModelProvider.generateText(AiPromptTemplates.MASTER_SYSTEM_PROMPT, userMessage);
        }

        List<AiChatResponseDto.RelatedMemoryDto> relatedMemories =
                memoryRetrievalService.toRelatedMemoryDtos(retrievedSummaries);
        List<AiChatResponseDto.RelatedMediaDto> relatedMedia =
                memoryRetrievalService.toRelatedMediaDtos(retrievedSummaries);

        return AiChatResponseDto.builder()
                .conversationId(conversationId)
                .mode(mode)
                .answer(answer)
                .relatedMemories(relatedMemories)
                .relatedMedia(relatedMedia)
                .suggestedQuestions(getDefaultSuggestions())
                .modelUsed(aiModelProvider.getActiveModelName())
                .build();
    }

    /**
     * Extracts structured criteria using Spring AI's BeanOutputConverter
     * with graceful JSON fallback.
     */
    public MemorySearchCriteria extractSearchCriteria(String userPrompt) {
        String systemInstructions = AiPromptTemplates.QUERY_UNDERSTANDING_SYSTEM_PROMPT + "\n" +
                criteriaConverter.getFormat();

        try {
            String rawJson = aiModelProvider.generateText(systemInstructions, userPrompt);
            return parseCriteriaJson(rawJson);
        } catch (Exception ex) {
            log.warn("Spring AI criteria extraction failed, falling back to heuristic parsing: {}", ex.getMessage());
            return heuristicFallbackExtraction(userPrompt);
        }
    }

    private MemorySearchCriteria parseCriteriaJson(String rawOutput) {
        if (rawOutput == null || rawOutput.isBlank()) {
            return fallbackGeneralCriteria();
        }

        String cleaned = rawOutput.trim();
        // Remove markdown code fences if the model wrapped the JSON
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        cleaned = cleaned.trim();

        try {
            return objectMapper.readValue(cleaned, MemorySearchCriteria.class);
        } catch (Exception ex) {
            log.warn("Jackson parsing of criteria failed on raw string: {}. Attempting Spring AI converter...", cleaned);
            try {
                return criteriaConverter.convert(cleaned);
            } catch (Exception e2) {
                log.error("Failed to parse MemorySearchCriteria JSON: {}", e2.getMessage());
                return fallbackGeneralCriteria();
            }
        }
    }

    private MemorySearchCriteria heuristicFallbackExtraction(String prompt) {
        String lower = prompt.toLowerCase();
        boolean isMemory = lower.contains("memory") || lower.contains("memories") || lower.contains("photo")
                || lower.contains("photos") || lower.contains("video") || lower.contains("farewell")
                || lower.contains("trip") || lower.contains("fest") || lower.contains("college")
                || lower.contains("hostel") || lower.contains("year") || lower.contains("first year");

        if (!isMemory) {
            return fallbackGeneralCriteria();
        }

        String mediaType = "ALL";
        if (lower.contains("photo") || lower.contains("photos") || lower.contains("image")) {
            mediaType = "PHOTOS";
        } else if (lower.contains("video") || lower.contains("videos") || lower.contains("clip")) {
            mediaType = "VIDEOS";
        }

        List<String> keywords = new ArrayList<>();
        for (String word : prompt.split("\\s+")) {
            String clean = word.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
            if (clean.length() > 3 && !List.of("show", "what", "where", "when", "tell", "have", "from", "with", "this", "that").contains(clean)) {
                keywords.add(clean);
            }
        }

        return MemorySearchCriteria.builder()
                .mode("MEMORY")
                .mediaType(mediaType)
                .keywords(keywords)
                .build();
    }

    private MemorySearchCriteria fallbackGeneralCriteria() {
        return MemorySearchCriteria.builder()
                .mode("GENERAL")
                .mediaType("ALL")
                .keywords(new ArrayList<>())
                .build();
    }

    public List<String> getDefaultSuggestions() {
        return List.of(
                "Show me our first year memories",
                "Do we have any farewell photos?",
                "What happened during the annual cultural fest?",
                "Show me photos from our campus road trips"
        );
    }
}
