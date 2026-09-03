package com.memoryverse.controller;

import com.memoryverse.dto.request.CreateSharedLinkRequestDto;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.SharedLinkResponseDto;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.SharedLinkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/shared-links")
@RequiredArgsConstructor
public class SharedLinkController {

    private final SharedLinkService sharedLinkService;

    @PostMapping
    public ResponseEntity<ApiResponse<SharedLinkResponseDto>> createOrGetShareLink(
            @Valid @RequestBody CreateSharedLinkRequestDto request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        SharedLinkResponseDto response = sharedLinkService.createOrGetSharedLink(request, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> revokeShareLink(@PathVariable UUID id) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        sharedLinkService.revokeSharedLink(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
