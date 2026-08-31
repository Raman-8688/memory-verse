package com.memoryverse.modules.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memoryverse.common.exception.ResourceNotFoundException;
import com.memoryverse.modules.ai.conversation.AiConversation;
import com.memoryverse.modules.ai.conversation.AiConversationRepository;
import com.memoryverse.modules.ai.conversation.AiMessage;
import com.memoryverse.modules.ai.conversation.AiMessageRepository;
import com.memoryverse.modules.ai.conversation.AiMessageRole;
import com.memoryverse.modules.ai.dto.AiChatRequestDto;
import com.memoryverse.modules.ai.dto.AiChatResponseDto;
import com.memoryverse.modules.ai.dto.AiMemorySummaryDto;
import com.memoryverse.modules.ai.dto.MemorySearchCriteria;
import com.memoryverse.modules.ai.prompt.AiPromptTemplates;
import com.memoryverse.modules.ai.provider.AiModelProvider;
import com.memoryverse.modules.ai.retrieval.MemoryRetrievalService;
import com.memoryverse.modules.ai.retrieval.PromptContextBuilder;
import com.memoryverse.modules.user.User;
import com.memoryverse.modules.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
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
    private final AiConversationRepository aiConversationRepository;
    private final AiMessageRepository aiMessageRepository;
    private final UserRepository userRepository;

    private final BeanOutputConverter<MemorySearchCriteria> criteriaConverter =
            new BeanOutputConverter<>(MemorySearchCriteria.class);

    private static final int MAX_RETRIEVAL_RESULTS = 10;
    private static final int MAX_HISTORY_WINDOW = 6;

    /**
     * Phase 5: Conversation Context & Persistent History.
     * Manages conversation lifecycle, retrieves rolling window (last 6 messages),
     * resolves contextual pronouns, generates grounded completions, and persists
     * turn history to PostgreSQL.
     */
    @Transactional
    public AiChatResponseDto processChat(UUID userId, AiChatRequestDto request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // 1. Resolve or Create Conversation
        AiConversation conversation = resolveOrCreateConversation(user, request.getConversationId());
        long startTime = System.currentTimeMillis();
        String conversationIdStr = conversation.getId().toString();
        String userMessage = request.getMessage().trim();

        log.info("Processing contextual AI Chat: userId={}, conversationId='{}', promptLength={}",
                userId, conversationIdStr, userMessage.length());

        // Security check: intercept attempts to probe system configurations or credentials
        String lower = userMessage.toLowerCase();
        if (lower.contains("password") || lower.contains("jwt_secret") || lower.contains("connection string")
                || lower.contains("database url") || lower.contains("api key") || lower.contains("ignore previous instructions")) {
            String securityRefusal = "I am designed solely to help you explore and preserve your memories, and cannot discuss or disclose internal system configurations or credentials.";
            saveMessageHistory(conversation, userMessage, securityRefusal);

            long durationMs = System.currentTimeMillis() - startTime;
            log.info("AI Chat security intercepted: userId={}, conversationId={}, durationMs={}",
                    userId, conversationIdStr, durationMs);

            return AiChatResponseDto.builder()
                    .conversationId(conversationIdStr)
                    .mode("GENERAL")
                    .answer(securityRefusal)
                    .suggestedQuestions(getDefaultSuggestions())
                    .modelUsed(aiModelProvider.getActiveModelName())
                    .build();
        }

        try {
            // 2. Load Rolling History (Max 6 Messages to prevent context window overflow)
            List<AiMessage> recentDbMessages = aiMessageRepository.findTop6ByConversationIdOrderByCreatedAtDesc(conversation.getId());
            List<AiMessage> chronologicalHistory = new ArrayList<>(recentDbMessages);
            Collections.reverse(chronologicalHistory); // Chronological order: oldest -> newest

            List<Message> springAiHistory = mapToSpringAiMessages(chronologicalHistory);

            // 3. Structured Intent Extraction (Aware of Recent Conversation Topic)
            MemorySearchCriteria criteria = extractContextualSearchCriteria(userMessage, chronologicalHistory);
            log.info("Contextual Intent Extraction: mode={}, mediaType={}, keywordsCount={}, journey={}, section={}",
                    criteria.getMode(), criteria.getMediaType(), criteria.getKeywords() != null ? criteria.getKeywords().size() : 0,
                    criteria.getJourneyName(), criteria.getSectionName());

            // 4. Dual-Mode Execution with Context
            AiChatResponseDto response;
            if ("MEMORY".equalsIgnoreCase(criteria.getMode())) {
                response = executeMemoryMode(conversationIdStr, userMessage, criteria, springAiHistory);
            } else {
                response = executeGeneralMode(conversationIdStr, userMessage, springAiHistory);
            }

            // 5. Persist Chat Messages to Database
            saveMessageHistory(conversation, userMessage, response.getAnswer());

            long durationMs = System.currentTimeMillis() - startTime;
            log.info("AI Chat completed successfully: userId={}, conversationId={}, mode={}, durationMs={}",
                    userId, conversationIdStr, response.getMode(), durationMs);

            return response;
        } catch (Exception ex) {
            long durationMs = System.currentTimeMillis() - startTime;
            log.error("AI Chat processing failed after {}ms for conversation {}: {}",
                    durationMs, conversationIdStr, ex.getMessage());
            throw new com.memoryverse.common.exception.AiServiceException("The Memory Assistant is currently busy. Please try again.", ex);
        }
    }

    /**
     * Resolves an existing conversation owned by the user, or creates a new one.
     */
    private AiConversation resolveOrCreateConversation(User user, String conversationIdStr) {
        if (conversationIdStr != null && !conversationIdStr.isBlank()) {
            try {
                UUID convUuid = UUID.fromString(conversationIdStr.trim());
                return aiConversationRepository.findByIdAndUserId(convUuid, user.getId())
                        .orElseGet(() -> createNewConversation(user, convUuid));
            } catch (IllegalArgumentException e) {
                log.debug("Invalid UUID format for conversationId '{}', creating new conversation", conversationIdStr);
            }
        }
        return createNewConversation(user, null);
    }

    private AiConversation createNewConversation(User user, UUID explicitId) {
        AiConversation.AiConversationBuilder builder = AiConversation.builder()
                .user(user)
                .title("Memory Chat - " + Instant.now().toString());

        if (explicitId != null) {
            builder.id(explicitId);
        }

        AiConversation created = aiConversationRepository.save(builder.build());
        log.info("Created new AiConversation: id={}, userId={}", created.getId(), user.getId());
        return created;
    }

    private List<Message> mapToSpringAiMessages(List<AiMessage> messages) {
        List<Message> springAiMessages = new ArrayList<>();
        for (AiMessage msg : messages) {
            if (msg.getRole() == AiMessageRole.USER) {
                springAiMessages.add(new UserMessage(msg.getContent()));
            } else if (msg.getRole() == AiMessageRole.ASSISTANT) {
                springAiMessages.add(new AssistantMessage(msg.getContent()));
            }
        }
        return springAiMessages;
    }

    private void saveMessageHistory(AiConversation conversation, String userContent, String assistantContent) {
        try {
            AiMessage userMsg = AiMessage.builder()
                    .conversation(conversation)
                    .role(AiMessageRole.USER)
                    .content(userContent)
                    .build();
            aiMessageRepository.save(userMsg);

            AiMessage assistantMsg = AiMessage.builder()
                    .conversation(conversation)
                    .role(AiMessageRole.ASSISTANT)
                    .content(assistantContent)
                    .build();
            aiMessageRepository.save(assistantMsg);

            conversation.setUpdatedAt(Instant.now());
            aiConversationRepository.save(conversation);
        } catch (Exception ex) {
            log.error("Failed to save chat turn history for conversation {}: {}", conversation.getId(), ex.getMessage());
        }
    }

    /**
     * MODE A — Memory Intelligence with Contextual Grounded QA.
     */
    private AiChatResponseDto executeMemoryMode(String conversationId, String userMessage,
                                                MemorySearchCriteria criteria, List<Message> history) {
        List<AiMemorySummaryDto> summaries = memoryRetrievalService.retrieveMemories(criteria, MAX_RETRIEVAL_RESULTS);

        // NO-RESULT HANDLING: Fast, deterministic return. Do NOT query LLM to avoid hallucinations.
        if (summaries.isEmpty()) {
            log.info("Zero memories matched in PostgreSQL. Returning clean, non-hallucinated response.");
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

        // GROUNDED GENERATION WITH ROLLING HISTORY
        String contextText = promptContextBuilder.buildContext(summaries);
        String userPromptWithContext = String.format("""
                USER QUESTION:
                %s
                
                %s
                
                Please answer the user's question with warmth, nostalgia, and precision using ONLY the records above.
                """, userMessage, contextText);

        log.info("Calling NVIDIA NIM for Grounded QA with history ({} msgs) and {} memory records...",
                history.size(), summaries.size());

        String rawOutput = aiModelProvider.generateWithHistory(
                AiPromptTemplates.GROUNDED_QA_SYSTEM_PROMPT,
                history,
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
     * MODE B — General AI Assistant with Rolling History.
     */
    private AiChatResponseDto executeGeneralMode(String conversationId, String userMessage, List<Message> history) {
        log.info("Executing General AI mode with history ({} msgs) for: '{}'", history.size(), userMessage);

        String rawOutput = aiModelProvider.generateWithHistory(
                AiPromptTemplates.GENERAL_AI_SYSTEM_PROMPT,
                history,
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
     * Context-aware criteria extraction: Includes recent conversation topics
     * so follow-up inquiries like "Who was there?" or "Show more photos from that"
     * accurately capture the previous journey/event context.
     */
    private MemorySearchCriteria extractContextualSearchCriteria(String userPrompt, List<AiMessage> history) {
        String promptToSend = userPrompt;

        if (history != null && !history.isEmpty()) {
            StringBuilder historyContext = new StringBuilder("RECENT CONVERSATION CONTEXT:\n");
            for (AiMessage m : history) {
                String snippet = m.getContent();
                if (snippet.length() > 120) {
                    snippet = snippet.substring(0, 117) + "...";
                }
                historyContext.append(m.getRole().name()).append(": ").append(snippet).append("\n");
            }
            promptToSend = historyContext + "\nCURRENT USER QUESTION:\n" + userPrompt;
        }

        String systemInstructions = AiPromptTemplates.QUERY_UNDERSTANDING_SYSTEM_PROMPT + "\n" +
                criteriaConverter.getFormat();

        try {
            String rawJson = aiModelProvider.generateText(systemInstructions, promptToSend);
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
