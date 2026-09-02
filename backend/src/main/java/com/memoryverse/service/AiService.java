package com.memoryverse.service;

import com.memoryverse.dto.request.AiChatRequestDto;
import com.memoryverse.dto.response.AiChatResponseDto;
import com.memoryverse.dto.response.AiModelInfoDto;

import java.util.List;
import java.util.UUID;

public interface AiService {

    AiChatResponseDto processChat(UUID userId, AiChatRequestDto request);

    List<AiModelInfoDto> getAvailableModels();

    List<String> getDefaultSuggestions();
}
