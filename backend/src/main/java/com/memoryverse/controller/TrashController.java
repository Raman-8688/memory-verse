package com.memoryverse.controller;

import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.TrashItemDto;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.TrashService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/trash")
@RequiredArgsConstructor
public class TrashController {

    private final TrashService trashService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TrashItemDto>>> getTrashItems() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        List<TrashItemDto> items = trashService.getTrashItems(currentUserId);
        return ResponseEntity.ok(ApiResponse.success(items));
    }

    @PostMapping("/restore/memory/{id}")
    public ResponseEntity<ApiResponse<Void>> restoreMemory(@PathVariable UUID id) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        trashService.restoreMemory(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/restore/journey/{id}")
    public ResponseEntity<ApiResponse<Void>> restoreJourney(@PathVariable UUID id) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        trashService.restoreJourney(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/memory/{id}")
    public ResponseEntity<ApiResponse<Void>> hardDeleteMemory(@PathVariable UUID id) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        trashService.hardDeleteMemory(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/journey/{id}")
    public ResponseEntity<ApiResponse<Void>> hardDeleteJourney(@PathVariable UUID id) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        trashService.hardDeleteJourney(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/empty")
    public ResponseEntity<ApiResponse<Void>> emptyTrash() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        trashService.emptyTrash(currentUserId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
