package com.memoryverse.controller;

import com.memoryverse.dto.request.MomentUpdateDto;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.MomentDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.MomentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/moments")
@RequiredArgsConstructor
public class MomentController {

    private final MomentService momentService;

    @PostMapping(consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<ApiResponse<MomentDto>> createMoment(
            @RequestPart("files") List<MultipartFile> files,
            @RequestPart(value = "caption", required = false) String caption) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        MomentDto created = momentService.createMoment(files, caption, currentUserId);
        return new ResponseEntity<>(ApiResponse.success("Moment shared successfully", created), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<MomentDto>>> listMoments(
            @RequestParam(value = "authorId", required = false) UUID authorId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        PagedResponse<MomentDto> paged = momentService.listMoments(authorId, page, size);
        return ResponseEntity.ok(ApiResponse.success(paged));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<MomentDto>> updateCaption(
            @PathVariable UUID id,
            @Valid @RequestBody MomentUpdateDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        MomentDto updated = momentService.updateCaption(id, dto.getCaption(), currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Caption updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteMoment(@PathVariable UUID id) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        momentService.deleteMoment(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.message("Moment deleted successfully"));
    }
}
