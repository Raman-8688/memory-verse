package com.memoryverse.controller;

import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.PublicSharedPayloadDto;
import com.memoryverse.service.SharedLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/public/s")
@RequiredArgsConstructor
public class PublicShareController {

    private final SharedLinkService sharedLinkService;

    @GetMapping("/{token}")
    public ResponseEntity<ApiResponse<PublicSharedPayloadDto>> getSharedContent(@PathVariable String token) {
        PublicSharedPayloadDto payload = sharedLinkService.getPublicPayload(token);
        return ResponseEntity.ok(ApiResponse.success(payload));
    }
}
