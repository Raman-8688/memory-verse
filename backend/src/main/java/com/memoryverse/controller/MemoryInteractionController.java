package com.memoryverse.controller;

import com.memoryverse.dto.request.CommentCreateDto;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.CommentResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.dto.response.ReactionSummaryDto;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.MemoryInteractionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/memories/{memoryId}")
@RequiredArgsConstructor
public class MemoryInteractionController {

    private final MemoryInteractionService interactionService;

    // --- COMMENTS ---

    @GetMapping("/comments")
    public ResponseEntity<ApiResponse<PagedResponse<CommentResponseDto>>> getComments(
            @PathVariable UUID memoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        PagedResponse<CommentResponseDto> comments = interactionService.getComments(memoryId, pageable);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }

    @PostMapping("/comments")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MEMBER')")
    public ResponseEntity<ApiResponse<CommentResponseDto>> addComment(
            @PathVariable UUID memoryId,
            @Valid @RequestBody CommentCreateDto dto) {
        UUID userId = SecurityUtils.getCurrentUserId();
        CommentResponseDto comment = interactionService.addComment(memoryId, dto, userId);
        return new ResponseEntity<>(ApiResponse.success("Comment added", comment), HttpStatus.CREATED);
    }

    @DeleteMapping("/comments/{commentId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MEMBER')")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable UUID memoryId,
            @PathVariable UUID commentId) {
        UUID userId = SecurityUtils.getCurrentUserId();
        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        interactionService.deleteComment(commentId, userId, isAdmin);
        return ResponseEntity.ok(ApiResponse.success("Comment deleted successfully", null));
    }

    // --- REACTIONS ---

    @GetMapping("/reactions")
    public ResponseEntity<ApiResponse<List<ReactionSummaryDto>>> getReactions(
            @PathVariable UUID memoryId) {
        UUID userId = SecurityUtils.getCurrentUserPrincipal().map(p -> p.getId()).orElse(null);
        List<ReactionSummaryDto> reactions = interactionService.getReactions(memoryId, userId);
        return ResponseEntity.ok(ApiResponse.success(reactions));
    }

    @PostMapping("/reactions/{emoji}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MEMBER')")
    public ResponseEntity<ApiResponse<List<ReactionSummaryDto>>> toggleReaction(
            @PathVariable UUID memoryId,
            @PathVariable String emoji) {
        UUID userId = SecurityUtils.getCurrentUserId();
        List<ReactionSummaryDto> reactions = interactionService.toggleReaction(memoryId, emoji, userId);
        return ResponseEntity.ok(ApiResponse.success("Reaction updated", reactions));
    }
}
