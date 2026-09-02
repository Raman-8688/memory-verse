package com.memoryverse.service;

import com.memoryverse.dto.request.CommentCreateDto;
import com.memoryverse.dto.response.CommentResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.dto.response.ReactionSummaryDto;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface MemoryInteractionService {

    PagedResponse<CommentResponseDto> getComments(UUID memoryId, Pageable pageable);

    CommentResponseDto addComment(UUID memoryId, CommentCreateDto dto, UUID userId);

    void deleteComment(UUID commentId, UUID userId, boolean isAdmin);

    List<ReactionSummaryDto> getReactions(UUID memoryId, UUID currentUserId);

    List<ReactionSummaryDto> toggleReaction(UUID memoryId, String emoji, UUID currentUserId);
}
