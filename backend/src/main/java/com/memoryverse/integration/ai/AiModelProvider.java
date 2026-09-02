package com.memoryverse.integration.ai;

import com.memoryverse.dto.response.AiModelInfoDto;

import java.util.List;

public interface AiModelProvider {

    /**
     * Generate text completion using the default configured model.
     *
     * @param systemPrompt Strict instructions and factual context boundaries
     * @param userPrompt   User query or formatted prompt
     * @return Completed text response from the LLM
     */
    String generateText(String systemPrompt, String userPrompt);

    /**
     * Generate text completion using a specific model name.
     *
     * @param modelName    Target model ID (e.g. meta/llama-3.1-70b-instruct)
     * @param systemPrompt Strict system instructions
     * @param userPrompt   User query
     * @return Completed text response
     */
    String generateWithModel(String modelName, String systemPrompt, String userPrompt);

    /**
     * Generate text completion taking into account a limited rolling window
     * of prior conversation messages using default model.
     */
    String generateWithHistory(String systemPrompt, List<org.springframework.ai.chat.messages.Message> history, String userPrompt);

    /**
     * Generate text completion taking into account a limited rolling window
     * of prior conversation messages using a specified model.
     */
    String generateWithHistory(String modelName, String systemPrompt, List<org.springframework.ai.chat.messages.Message> history, String userPrompt);

    /**
     * Returns the current active default model identifier.
     */
    String getActiveModelName();

    /**
     * Returns the list of verified, available models in the catalog.
     */
    List<AiModelInfoDto> getAvailableModels();
}
