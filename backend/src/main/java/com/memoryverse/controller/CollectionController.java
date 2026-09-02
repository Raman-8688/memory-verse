package com.memoryverse.controller;

import com.memoryverse.dto.request.CollectionCreateDto;
import com.memoryverse.dto.request.CollectionUpdateDto;
import com.memoryverse.dto.request.PageRequestDto;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.CollectionResponseDto;
import com.memoryverse.dto.response.MemoryResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.CollectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/collections")
@RequiredArgsConstructor
public class CollectionController {

    private final CollectionService collectionService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CollectionResponseDto>>> getAllCollections() {
        return ResponseEntity.ok(ApiResponse.success(collectionService.getAllCollections()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CollectionResponseDto>> getCollectionById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(collectionService.getCollectionById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CollectionResponseDto>> createCollection(@Valid @RequestBody CollectionCreateDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        CollectionResponseDto created = collectionService.createCollection(dto, currentUserId);
        return new ResponseEntity<>(ApiResponse.success("Collection created successfully", created), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CollectionResponseDto>> updateCollection(
            @PathVariable UUID id,
            @Valid @RequestBody CollectionUpdateDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        CollectionResponseDto updated = collectionService.updateCollection(id, dto, currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Collection updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCollection(@PathVariable UUID id) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        collectionService.deleteCollection(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Collection deleted successfully", null));
    }

    @GetMapping("/{id}/memories")
    public ResponseEntity<ApiResponse<PagedResponse<MemoryResponseDto>>> getCollectionMemories(
            @PathVariable UUID id,
            @Valid PageRequestDto pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(collectionService.getCollectionMemories(id, pageRequest.toPageable())));
    }

    @PostMapping("/{id}/memories/{memoryId}")
    public ResponseEntity<ApiResponse<Void>> addMemoryToCollection(
            @PathVariable UUID id,
            @PathVariable UUID memoryId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        collectionService.addMemoryToCollection(id, memoryId, currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Memory added to collection", null));
    }

    @DeleteMapping("/{id}/memories/{memoryId}")
    public ResponseEntity<ApiResponse<Void>> removeMemoryFromCollection(
            @PathVariable UUID id,
            @PathVariable UUID memoryId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        collectionService.removeMemoryFromCollection(id, memoryId, currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Memory removed from collection", null));
    }
}
