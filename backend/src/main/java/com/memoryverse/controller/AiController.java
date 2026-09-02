package com.memoryverse.controller;

import com.memoryverse.dto.request.AiChatRequestDto;
import com.memoryverse.dto.response.AiChatResponseDto;
import com.memoryverse.dto.response.AiModelInfoDto;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.security.SecurityUtils;
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

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AiChatResponseDto>> chat(
            @Valid @RequestBody AiChatRequestDto request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        AiChatResponseDto response = aiService.processChat(currentUserId, request);
        return ResponseEntity.ok(ApiResponse.success("AI response generated", response));
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
