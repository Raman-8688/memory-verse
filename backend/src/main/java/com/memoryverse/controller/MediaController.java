package com.memoryverse.controller;

import com.memoryverse.dto.request.TranscriptUpdateDto;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.MediaResponseDto;
import com.memoryverse.service.MediaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<MediaResponseDto>> uploadMedia(
            @RequestParam("file") MultipartFile file) {
        MediaResponseDto response = mediaService.uploadSingleFile(file);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}/transcript")
    public ResponseEntity<ApiResponse<MediaResponseDto>> updateTranscript(
            @PathVariable UUID id,
            @Valid @RequestBody TranscriptUpdateDto request) {
        MediaResponseDto response = mediaService.updateTranscript(id, request.getTranscript());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
