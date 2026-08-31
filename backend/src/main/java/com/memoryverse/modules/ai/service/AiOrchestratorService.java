package com.memoryverse.modules.ai.service;

import com.memoryverse.modules.ai.dto.AiChatRequestDto;
import com.memoryverse.modules.ai.dto.AiChatResponseDto;
import com.memoryverse.modules.ai.prompt.AiPromptTemplates;
import com.memoryverse.modules.ai.provider.AiModelProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiOrchestratorService {

    private final AiModelProvider aiModelProvider;

    /**
     * Phase 1 Foundation Service:
     * Receives authenticated user message, manages conversation ID,
     * calls the NVIDIA AI provider with the strict System Prompt, and
     * returns a structured response envelope.
     */
    public AiChatResponseDto processChat(UUID userId, AiChatRequestDto request) {
        String conversationId = (request.getConversationId() != null && !request.getConversationId().isBlank())
                ? request.getConversationId()
                : UUID.randomUUID().toString();

        log.info("Processing AI Chat request for user: {}, conversationId: '{}'", userId, conversationId);

        String userMessage = request.getMessage().trim();

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

        // Call AI Provider with strict master system prompt
        String answer = aiModelProvider.generateText(AiPromptTemplates.MASTER_SYSTEM_PROMPT, userMessage);

        return AiChatResponseDto.builder()
                .conversationId(conversationId)
                .mode("GENERAL") // In Phase 2 & 3, dynamically set to MEMORY or GENERAL based on intent classification
                .answer(answer)
                .relatedMemories(new ArrayList<>())
                .relatedMedia(new ArrayList<>())
                .suggestedQuestions(getDefaultSuggestions())
                .modelUsed(aiModelProvider.getActiveModelName())
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
