package com.memoryverse.modules.memory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memoryverse.common.api.ApiResponse;
import com.memoryverse.common.api.PageRequestDto;
import com.memoryverse.common.api.PagedResponse;
import com.memoryverse.common.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/memories")
@RequiredArgsConstructor
public class MemoryController {

    private final MemoryService memoryService;
    private final ObjectMapper objectMapper;

    @PostMapping(consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<ApiResponse<MemoryResponseDto>> createMemoryWithFiles(
            @RequestPart("data") String dataJson,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        
        try {
            MemoryCreateDto dto = objectMapper.readValue(dataJson, MemoryCreateDto.class);
            UUID currentUserId = SecurityUtils.getCurrentUserId();
            MemoryResponseDto created = memoryService.createMemory(dto, files, currentUserId);
            return new ResponseEntity<>(ApiResponse.success("Memory published successfully", created), HttpStatus.CREATED);
        } catch (Exception e) {
            log.error("Failed to parse memory json or process upload", e);
            throw new RuntimeException("Error processing memory upload: " + e.getMessage(), e);
        }
    }

    @PostMapping(value = "/json", consumes = {MediaType.APPLICATION_JSON_VALUE})
    public ResponseEntity<ApiResponse<MemoryResponseDto>> createMemoryJson(
            @Valid @RequestBody MemoryCreateDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        MemoryResponseDto created = memoryService.createMemory(dto, null, currentUserId);
        return new ResponseEntity<>(ApiResponse.success("Memory published successfully", created), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<MemoryResponseDto>>> getMemories(
            @RequestParam(required = false) UUID journeyId,
            @RequestParam(required = false) UUID sectionId,
            @RequestParam(required = false) String search,
            @Valid PageRequestDto pageRequest) {
        
        PagedResponse<MemoryResponseDto> memories = memoryService.getMemories(
                journeyId, sectionId, search, pageRequest.toPageable());
        return ResponseEntity.ok(ApiResponse.success(memories));
    }

    @GetMapping("/tagged")
    public ResponseEntity<ApiResponse<PagedResponse<MemoryResponseDto>>> getTaggedMemories(
            @RequestParam(required = false) UUID userId,
            @Valid PageRequestDto pageRequest) {
        UUID targetUserId = userId != null ? userId : SecurityUtils.getCurrentUserId();
        PagedResponse<MemoryResponseDto> memories = memoryService.getMemoriesTaggedWithUser(
                targetUserId, pageRequest.toPageable());
        return ResponseEntity.ok(ApiResponse.success(memories));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MemoryResponseDto>> getMemoryById(@PathVariable UUID id) {
        MemoryResponseDto memory = memoryService.getMemoryById(id);
        return ResponseEntity.ok(ApiResponse.success(memory));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MemoryResponseDto>> updateMemory(
            @PathVariable UUID id,
            @Valid @RequestBody MemoryUpdateDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        MemoryResponseDto updated = memoryService.updateMemory(id, dto, currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Memory updated successfully", updated));
    }

    @PostMapping(value = "/{id}/media", consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<ApiResponse<MemoryResponseDto>> appendMedia(
            @PathVariable UUID id,
            @RequestPart("files") List<MultipartFile> files) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        MemoryResponseDto updated = memoryService.appendMedia(id, files, currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Media appended successfully", updated));
    }
}
