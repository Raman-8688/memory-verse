package com.memoryverse.modules.ai.provider;

import com.memoryverse.modules.ai.dto.AiModelInfoDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class NvidiaNimProvider implements AiModelProvider {

    private final ChatModel chatModel;

    @Value("${spring.ai.openai.chat.options.model:meta/llama-3.1-70b-instruct}")
    private String primaryModel;

    @Value("${spring.ai.openai.api-key:nvapi-placeholder-key}")
    private String apiKey;

    public static final List<AiModelInfoDto> CATALOG_MODELS = List.of(
            AiModelInfoDto.builder()
                    .id("meta/llama-3.1-8b-instruct")
                    .name("Llama 3.1 8B (Fast & Verified Working)")
                    .description("Ultra-fast inference, optimal for memory search and QA")
                    .badge("Fast & Verified")
                    .isDefault(true)
                    .build(),
            AiModelInfoDto.builder()
                    .id("meta/llama-3.3-70b-instruct")
                    .name("Llama 3.3 70B (High Intelligence)")
                    .description("Advanced reasoning, deep memory synthesis & storytelling")
                    .badge("High Intelligence")
                    .isDefault(false)
                    .build(),
            AiModelInfoDto.builder()
                    .id("deepseek-ai/deepseek-r1")
                    .name("DeepSeek R1 (Reasoning AI)")
                    .description("Chain-of-thought reasoning AI")
                    .badge("Reasoning AI")
                    .isDefault(false)
                    .build(),
            AiModelInfoDto.builder()
                    .id("mistralai/mistral-large-2-instruct")
                    .name("Mistral Large 2")
                    .description("Flagship multilingual model with nuanced context")
                    .badge("Creative")
                    .isDefault(false)
                    .build(),
            AiModelInfoDto.builder()
                    .id("google/gemma-2-9b-it")
                    .name("Google Gemma 2 9B")
                    .description("Precise factual recall and high efficiency")
                    .badge("Google AI")
                    .isDefault(false)
                    .build()
    );

    private static final List<String> FALLBACK_MODELS = List.of(
            "meta/llama-3.1-8b-instruct",
            "meta/llama-3.3-70b-instruct",
            "meta/llama-3.1-70b-instruct",
            "mistralai/mistral-large-2-instruct",
            "google/gemma-2-9b-it"
    );

    public NvidiaNimProvider(ChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @Override
    public String generateText(String systemPrompt, String userPrompt) {
        return generateWithModel(primaryModel, systemPrompt, userPrompt);
    }

    @Override
    public String generateWithModel(String modelName, String systemPrompt, String userPrompt) {
        if (apiKey == null || apiKey.isBlank() || apiKey.contains("placeholder")) {
            log.warn("NVIDIA NIM API key is not configured or placeholder.");
            return "NVIDIA NIM API key is not configured in environment (NVIDIA_API_KEY). Please configure a valid API key to enable live LLM inference.";
        }

        String target = (modelName != null && !modelName.isBlank()) ? modelName.trim() : primaryModel;

        try {
            log.info("Calling NVIDIA NIM API with model: {}", target);
            return executeCall(target, systemPrompt, userPrompt);
        } catch (Exception e) {
            log.warn("Primary model {} invocation failed: {}. Attempting fallback models...", target, e.getMessage());

            for (String fallbackModel : FALLBACK_MODELS) {
                if (fallbackModel.equalsIgnoreCase(target)) {
                    continue;
                }
                try {
                    log.info("Attempting fallback with NVIDIA NIM model: {}", fallbackModel);
                    return executeCall(fallbackModel, systemPrompt, userPrompt);
                } catch (Exception fallbackEx) {
                    log.warn("Fallback model {} failed: {}", fallbackModel, fallbackEx.getMessage());
                }
            }

            log.error("All configured NVIDIA NIM models failed to generate response.");
            throw new RuntimeException("All configured NVIDIA NIM models failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String generateWithHistory(String systemPrompt, List<org.springframework.ai.chat.messages.Message> history, String userPrompt) {
        return generateWithHistory(primaryModel, systemPrompt, history, userPrompt);
    }

    @Override
    public String generateWithHistory(String modelName, String systemPrompt, List<org.springframework.ai.chat.messages.Message> history, String userPrompt) {
        if (apiKey == null || apiKey.isBlank() || apiKey.contains("placeholder")) {
            log.warn("NVIDIA NIM API key is not configured or placeholder.");
            return "NVIDIA NIM API key is not configured in environment (NVIDIA_API_KEY). Please configure a valid API key to enable live LLM inference.";
        }

        String target = (modelName != null && !modelName.isBlank()) ? modelName.trim() : primaryModel;

        List<org.springframework.ai.chat.messages.Message> allMessages = new ArrayList<>();
        allMessages.add(new SystemMessage(systemPrompt));
        if (history != null && !history.isEmpty()) {
            allMessages.addAll(history);
        }
        allMessages.add(new UserMessage(userPrompt));

        try {
            log.info("Calling NVIDIA NIM API with model: {} and {} history messages", target, history != null ? history.size() : 0);
            return executeCallWithMessages(target, allMessages);
        } catch (Exception e) {
            log.warn("Target model {} invocation failed: {}. Attempting fallback models...", target, e.getMessage());

            for (String fallbackModel : FALLBACK_MODELS) {
                if (fallbackModel.equalsIgnoreCase(target)) {
                    continue;
                }
                try {
                    log.info("Attempting fallback with NVIDIA NIM model: {}", fallbackModel);
                    return executeCallWithMessages(fallbackModel, allMessages);
                } catch (Exception fallbackEx) {
                    log.warn("Fallback model {} failed: {}", fallbackModel, fallbackEx.getMessage());
                }
            }

            log.error("All configured NVIDIA NIM models failed to generate response with history.");
            throw new RuntimeException("All configured NVIDIA NIM models failed: " + e.getMessage(), e);
        }
    }

    private String executeCall(String targetModel, String systemPrompt, String userPrompt) {
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .withModel(targetModel)
                .withTemperature(0.2)
                .withMaxTokens(2048)
                .build();

        Prompt prompt = new Prompt(
                List.of(
                        new SystemMessage(systemPrompt),
                        new UserMessage(userPrompt)
                ),
                options
        );

        return chatModel.call(prompt).getResult().getOutput().getContent();
    }

    private String executeCallWithMessages(String targetModel, List<org.springframework.ai.chat.messages.Message> messages) {
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .withModel(targetModel)
                .withTemperature(0.2)
                .withMaxTokens(2048)
                .build();

        Prompt prompt = new Prompt(messages, options);
        return chatModel.call(prompt).getResult().getOutput().getContent();
    }

    @Override
    public String getActiveModelName() {
        return primaryModel;
    }

    @Override
    public List<AiModelInfoDto> getAvailableModels() {
        return CATALOG_MODELS;
    }
}
