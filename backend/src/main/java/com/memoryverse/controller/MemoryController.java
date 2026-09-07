package com.memoryverse.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memoryverse.dto.request.MemoryCreateDto;
import com.memoryverse.dto.request.MemoryUpdateDto;
import com.memoryverse.dto.request.PageRequestDto;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.MemoryResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.dto.response.PlaceSummaryDto;
import com.memoryverse.dto.response.RelatedMemoryResponseDto;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.MemoryService;
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
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) Boolean isFavorite,
            @RequestParam(required = false) String place,
            @Valid PageRequestDto pageRequest) {
        
        PagedResponse<MemoryResponseDto> memories = memoryService.getMemories(
                journeyId, sectionId, search, year, month, userId, isFavorite, place, pageRequest.toPageable());
        return ResponseEntity.ok(ApiResponse.success(memories));
    }

    @GetMapping("/places")
    public ResponseEntity<ApiResponse<List<PlaceSummaryDto>>> getPlaces() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(memoryService.getPlacesSummary(currentUserId)));
    }

    @PostMapping("/{id}/favorite")
    public ResponseEntity<ApiResponse<MemoryResponseDto>> toggleFavorite(@PathVariable UUID id) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        MemoryResponseDto updated = memoryService.toggleFavorite(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(Boolean.TRUE.equals(updated.getIsFavorite()) ? "Memory added to favorites" : "Memory removed from favorites", updated));
    }

    @GetMapping("/years")
    public ResponseEntity<ApiResponse<List<Integer>>> getMemoryYears() {
        return ResponseEntity.ok(ApiResponse.success(memoryService.getAvailableYears()));
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

    @GetMapping("/{id}/related")
    public ResponseEntity<ApiResponse<List<RelatedMemoryResponseDto>>> getRelatedMemories(@PathVariable UUID id) {
        List<RelatedMemoryResponseDto> related = memoryService.getRelatedMemories(id);
        return ResponseEntity.ok(ApiResponse.success(related));
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

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMemory(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean permanent) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        memoryService.deleteMemory(id, permanent, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(permanent ? "Memory permanently deleted" : "Memory moved to trash", null));
    }

    @DeleteMapping("/{id}/media/{mediaId}")
    public ResponseEntity<ApiResponse<Void>> deleteMedia(
            @PathVariable UUID id,
            @PathVariable UUID mediaId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        memoryService.deleteMedia(id, mediaId, currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Media deleted successfully", null));
    }
}
