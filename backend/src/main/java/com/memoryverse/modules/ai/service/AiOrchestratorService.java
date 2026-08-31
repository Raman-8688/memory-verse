package com.memoryverse.modules.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memoryverse.modules.ai.dto.AiChatRequestDto;
import com.memoryverse.modules.ai.dto.AiChatResponseDto;
import com.memoryverse.modules.ai.dto.AiMemorySummaryDto;
import com.memoryverse.modules.ai.dto.MemorySearchCriteria;
import com.memoryverse.modules.ai.prompt.AiPromptTemplates;
import com.memoryverse.modules.ai.provider.AiModelProvider;
import com.memoryverse.modules.ai.retrieval.MemoryRetrievalService;
import com.memoryverse.modules.ai.retrieval.PromptContextBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiOrchestratorService {

    private final AiModelProvider aiModelProvider;
    private final MemoryRetrievalService memoryRetrievalService;
    private final PromptContextBuilder promptContextBuilder;
    private final ObjectMapper objectMapper;

    private final BeanOutputConverter<MemorySearchCriteria> criteriaConverter =
            new BeanOutputConverter<>(MemorySearchCriteria.class);

    private static final int MAX_RETRIEVAL_RESULTS = 10;

    /**
     * Phase 3: Complete AI Grounded Response & Dual-Mode Orchestration.
     * Mode A (Memory Search): Executes Intent Extraction -> PostgreSQL JPA Retrieval ->
     * Grounded Answer Generation (or instant no-result response if empty).
     * Mode B (General AI): Bypasses database and queries LLM as general conversational assistant.
     */
    public AiChatResponseDto processChat(UUID userId, AiChatRequestDto request) {
        String conversationId = (request.getConversationId() != null && !request.getConversationId().isBlank())
                ? request.getConversationId()
                : UUID.randomUUID().toString();

        String userMessage = request.getMessage().trim();
        log.info("Processing AI Chat: user={}, conversationId='{}', prompt='{}'",
                userId, conversationId, userMessage);

        // Security check: intercept attempts to probe system configurations or credentials
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

        // 1. Intent Extraction via Spring AI
        MemorySearchCriteria criteria = extractSearchCriteria(userMessage);
        log.info("Intent Extraction Result: mode={}, mediaType={}, keywords={}, journey={}, section={}",
                criteria.getMode(), criteria.getMediaType(), criteria.getKeywords(),
                criteria.getJourneyName(), criteria.getSectionName());

        // 2. Dual-Mode Execution
        if ("MEMORY".equalsIgnoreCase(criteria.getMode())) {
            return executeMemoryMode(conversationId, userMessage, criteria);
        } else {
            return executeGeneralMode(conversationId, userMessage);
        }
    }

    /**
     * MODE A — Memory Intelligence:
     * 1. Query database via type-safe JPA Specification.
     * 2. If no results found -> Fast return with no hallucination.
     * 3. If results found -> Grounded LLM generation using ONLY retrieved records.
     */
    private AiChatResponseDto executeMemoryMode(String conversationId, String userMessage, MemorySearchCriteria criteria) {
        List<AiMemorySummaryDto> summaries = memoryRetrievalService.retrieveMemories(criteria, MAX_RETRIEVAL_RESULTS);

        // NO-RESULT HANDLING: Fast, deterministic return. Do NOT query LLM to avoid hallucinations.
        if (summaries.isEmpty()) {
            log.info("Zero memories matched criteria in PostgreSQL. Returning clean no-result message.");
            return AiChatResponseDto.builder()
                    .conversationId(conversationId)
                    .mode("MEMORY")
                    .answer("I couldn't find any matching memories in MemoryVerse.")
                    .relatedMemories(Collections.emptyList())
                    .relatedMedia(Collections.emptyList())
                    .suggestedQuestions(getDefaultSuggestions())
                    .modelUsed(aiModelProvider.getActiveModelName())
                    .build();
        }

        // GROUNDED GENERATION: Serialize retrieved facts and pass to LLM
        String contextText = promptContextBuilder.buildContext(summaries);
        String userPromptWithContext = String.format("""
                USER QUESTION:
                %s
                
                %s
                
                Please answer the user's question with warmth, nostalgia, and accuracy using ONLY the records above.
                """, userMessage, contextText);

        log.info("Calling NVIDIA NIM for Grounded QA completion with {} memory records...", summaries.size());
        String rawOutput = aiModelProvider.generateText(
                AiPromptTemplates.GROUNDED_QA_SYSTEM_PROMPT,
                userPromptWithContext
        );

        ParsedCompletion parsed = parseAnswerAndSuggestions(rawOutput, getDefaultSuggestions());

        List<AiChatResponseDto.RelatedMemoryDto> relatedMemories =
                memoryRetrievalService.toRelatedMemoryDtos(summaries);
        List<AiChatResponseDto.RelatedMediaDto> relatedMedia =
                memoryRetrievalService.toRelatedMediaDtos(summaries);

        return AiChatResponseDto.builder()
                .conversationId(conversationId)
                .mode("MEMORY")
                .answer(parsed.answer())
                .relatedMemories(relatedMemories)
                .relatedMedia(relatedMedia)
                .suggestedQuestions(parsed.suggestions())
                .modelUsed(aiModelProvider.getActiveModelName())
                .build();
    }

    /**
     * MODE B — General AI Assistant:
     * Bypasses PostgreSQL database entirely and queries the model as general conversational assistant.
     */
    private AiChatResponseDto executeGeneralMode(String conversationId, String userMessage) {
        log.info("Executing General AI mode for prompt: '{}'", userMessage);

        String rawOutput = aiModelProvider.generateText(
                AiPromptTemplates.GENERAL_AI_SYSTEM_PROMPT,
                userMessage
        );

        List<String> generalFallbacks = List.of(
                "Show me our first year memories",
                "Do we have any farewell photos?",
                "What happened during the annual cultural fest?"
        );
        ParsedCompletion parsed = parseAnswerAndSuggestions(rawOutput, generalFallbacks);

        return AiChatResponseDto.builder()
                .conversationId(conversationId)
                .mode("GENERAL")
                .answer(parsed.answer())
                .relatedMemories(Collections.emptyList())
                .relatedMedia(Collections.emptyList())
                .suggestedQuestions(parsed.suggestions())
                .modelUsed(aiModelProvider.getActiveModelName())
                .build();
    }

    /**
     * Extracts structured criteria using Spring AI's BeanOutputConverter
     * with graceful JSON cleanup and Jackson fallback.
     */
    public MemorySearchCriteria extractSearchCriteria(String userPrompt) {
        String systemInstructions = AiPromptTemplates.QUERY_UNDERSTANDING_SYSTEM_PROMPT + "\n" +
                criteriaConverter.getFormat();

        try {
            String rawJson = aiModelProvider.generateText(systemInstructions, userPrompt);
            return parseCriteriaJson(rawJson);
        } catch (Exception ex) {
            log.warn("Criteria extraction failed, falling back to heuristic parsing: {}", ex.getMessage());
            return heuristicFallbackExtraction(userPrompt);
        }
    }

    private MemorySearchCriteria parseCriteriaJson(String rawOutput) {
        if (rawOutput == null || rawOutput.isBlank()) {
            return fallbackGeneralCriteria();
        }

        String cleaned = rawOutput.trim();
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
            log.warn("Jackson parsing of criteria failed: {}. Attempting Spring AI converter...", cleaned);
            try {
                return criteriaConverter.convert(cleaned);
            } catch (Exception e2) {
                log.error("Failed to parse MemorySearchCriteria JSON: {}", e2.getMessage());
                return fallbackGeneralCriteria();
            }
        }
    }

    private ParsedCompletion parseAnswerAndSuggestions(String rawOutput, List<String> fallbackSuggestions) {
        if (rawOutput == null || rawOutput.isBlank()) {
            return new ParsedCompletion("I'm here to help you explore your memories.", fallbackSuggestions);
        }

        String answer = rawOutput.trim();
        List<String> suggestions = new ArrayList<>();

        int sugIdx = answer.indexOf("SUGGESTIONS:");
        if (sugIdx != -1) {
            String sugPart = answer.substring(sugIdx + "SUGGESTIONS:".length()).trim();
            answer = answer.substring(0, sugIdx).trim();

            String[] parts = sugPart.split("\\|");
            for (String p : parts) {
                String clean = p.trim().replaceAll("^[-*\\d.]+", "").trim();
                if (!clean.isEmpty()) {
                    suggestions.add(clean);
                }
            }
        }

        if (suggestions.isEmpty()) {
            suggestions.addAll(fallbackSuggestions);
        }

        return new ParsedCompletion(answer, suggestions);
    }

    private record ParsedCompletion(String answer, List<String> suggestions) {}

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
