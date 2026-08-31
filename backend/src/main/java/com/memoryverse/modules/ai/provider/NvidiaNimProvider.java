package com.memoryverse.modules.ai.provider;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
public class NvidiaNimProvider implements AiModelProvider {

    private final ChatModel chatModel;

    @Value("${spring.ai.openai.chat.options.model:meta/llama-3.1-70b-instruct}")
    private String primaryModel;

    @Value("${spring.ai.openai.api-key:nvapi-placeholder-key}")
    private String apiKey;

    private static final List<String> FALLBACK_MODELS = List.of(
            "meta/llama-3.1-8b-instruct",
            "mistralai/mistral-7b-instruct-v0.2",
            "google/gemma-2-27b-it"
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
            log.warn("NVIDIA NIM API key is not configured or placeholder. Providing offline simulated guidance.");
            return "NVIDIA NIM API key is not configured in environment (NVIDIA_API_KEY). Please configure a valid API key to enable live LLM inference.";
        }

        // Try primary model
        try {
            log.info("Calling NVIDIA NIM API with model: {}", modelName);
            return executeCall(modelName, systemPrompt, userPrompt);
        } catch (Exception e) {
            log.warn("Primary model {} invocation failed: {}. Attempting fallback models...", modelName, e.getMessage());

            // Try fallback models
            for (String fallbackModel : FALLBACK_MODELS) {
                if (fallbackModel.equalsIgnoreCase(modelName)) {
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
            return "The AI service is currently encountering difficulty communicating with the language model provider. Please verify your NVIDIA API key and connectivity.";
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

    @Override
    public String getActiveModelName() {
        return primaryModel;
    }
}
