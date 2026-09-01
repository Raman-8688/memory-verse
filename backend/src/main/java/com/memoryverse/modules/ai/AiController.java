package com.memoryverse.modules.ai;

import com.memoryverse.common.api.ApiResponse;
import com.memoryverse.common.util.SecurityUtils;
import com.memoryverse.modules.ai.dto.AiChatRequestDto;
import com.memoryverse.modules.ai.dto.AiChatResponseDto;
import com.memoryverse.modules.ai.service.AiOrchestratorService;
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

    private final AiOrchestratorService aiOrchestratorService;

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AiChatResponseDto>> chat(
            @Valid @RequestBody AiChatRequestDto request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        AiChatResponseDto response = aiOrchestratorService.processChat(currentUserId, request);
        return ResponseEntity.ok(ApiResponse.success("AI response generated", response));
    }

    @GetMapping("/suggestions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<String>>> getSuggestions() {
        List<String> suggestions = aiOrchestratorService.getDefaultSuggestions();
        return ResponseEntity.ok(ApiResponse.success(suggestions));
    }

    @GetMapping("/models")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<com.memoryverse.modules.ai.dto.AiModelInfoDto>>> getModels() {
        List<com.memoryverse.modules.ai.dto.AiModelInfoDto> models = aiOrchestratorService.getAvailableModels();
        return ResponseEntity.ok(ApiResponse.success(models));
    }
}
