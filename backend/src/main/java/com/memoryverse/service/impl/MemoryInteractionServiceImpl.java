package com.memoryverse.service.impl;

import com.memoryverse.dto.request.CommentCreateDto;
import com.memoryverse.dto.response.CommentResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.dto.response.ReactionSummaryDto;
import com.memoryverse.entity.Memory;
import com.memoryverse.entity.MemoryComment;
import com.memoryverse.entity.MemoryReaction;
import com.memoryverse.entity.User;
import com.memoryverse.exception.ForbiddenException;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.repository.MemoryCommentRepository;
import com.memoryverse.repository.MemoryReactionRepository;
import com.memoryverse.repository.MemoryRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.service.MemoryInteractionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemoryInteractionServiceImpl implements MemoryInteractionService {

    private final MemoryRepository memoryRepository;
    private final MemoryCommentRepository commentRepository;
    private final MemoryReactionRepository reactionRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommentResponseDto> getComments(UUID memoryId, Pageable pageable) {
        if (!memoryRepository.existsById(memoryId)) {
            throw new ResourceNotFoundException("Memory not found with id: " + memoryId);
        }

        Page<MemoryComment> page = commentRepository.findByMemoryIdWithUser(memoryId, pageable);
        List<CommentResponseDto> content = page.getContent().stream()
                .map(CommentResponseDto::fromEntity)
                .collect(Collectors.toList());

        return PagedResponse.<CommentResponseDto>builder()
                .content(content)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    @Override
    @Transactional
    public CommentResponseDto addComment(UUID memoryId, CommentCreateDto dto, UUID userId) {
        Memory memory = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found with id: " + memoryId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        MemoryComment comment = MemoryComment.builder()
                .memory(memory)
                .user(user)
                .content(dto.getContent().trim())
                .build();

        MemoryComment saved = commentRepository.save(comment);
        log.info("User {} added comment {} to memory {}", userId, saved.getId(), memoryId);
        return CommentResponseDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public void deleteComment(UUID commentId, UUID userId, boolean isAdmin) {
        MemoryComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found with id: " + commentId));

        boolean isAuthor = comment.getUser().getId().equals(userId);
        boolean isMemoryOwner = comment.getMemory().getCreatedBy().getId().equals(userId);

        if (!isAuthor && !isMemoryOwner && !isAdmin) {
            throw new ForbiddenException("You do not have permission to delete this comment");
        }

        commentRepository.delete(comment);
        log.info("Comment {} deleted by user {}", commentId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReactionSummaryDto> getReactions(UUID memoryId, UUID currentUserId) {
        if (!memoryRepository.existsById(memoryId)) {
            throw new ResourceNotFoundException("Memory not found with id: " + memoryId);
        }

        List<MemoryReaction> reactions = reactionRepository.findByMemoryIdWithUser(memoryId);
        return aggregateReactions(reactions, currentUserId);
    }

    @Override
    @Transactional
    public List<ReactionSummaryDto> toggleReaction(UUID memoryId, String emoji, UUID currentUserId) {
        Memory memory = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found with id: " + memoryId));

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + currentUserId));

        String sanitizedEmoji = emoji.trim();
        Optional<MemoryReaction> existing = reactionRepository.findByMemoryIdAndUserIdAndEmoji(memoryId, currentUserId, sanitizedEmoji);

        if (existing.isPresent()) {
            reactionRepository.delete(existing.get());
            log.info("User {} removed reaction {} from memory {}", currentUserId, sanitizedEmoji, memoryId);
        } else {
            MemoryReaction reaction = MemoryReaction.builder()
                    .memory(memory)
                    .user(user)
                    .emoji(sanitizedEmoji)
                    .build();
            reactionRepository.save(reaction);
            log.info("User {} added reaction {} to memory {}", currentUserId, sanitizedEmoji, memoryId);
        }

        // Return updated summaries
        List<MemoryReaction> updated = reactionRepository.findByMemoryIdWithUser(memoryId);
        return aggregateReactions(updated, currentUserId);
    }

    private List<ReactionSummaryDto> aggregateReactions(List<MemoryReaction> reactions, UUID currentUserId) {
        Map<String, List<MemoryReaction>> grouped = reactions.stream()
                .collect(Collectors.groupingBy(MemoryReaction::getEmoji, LinkedHashMap::new, Collectors.toList()));

        List<ReactionSummaryDto> result = new ArrayList<>();
        for (Map.Entry<String, List<MemoryReaction>> entry : grouped.entrySet()) {
            String emoji = entry.getKey();
            List<MemoryReaction> list = entry.getValue();
            boolean reactedByMe = currentUserId != null && list.stream()
                    .anyMatch(r -> r.getUser().getId().equals(currentUserId));
            List<String> names = list.stream()
                    .map(r -> r.getUser().getFullName())
                    .distinct()
                    .collect(Collectors.toList());

            result.add(ReactionSummaryDto.builder()
                    .emoji(emoji)
                    .count(list.size())
                    .reactedByCurrentUser(reactedByMe)
                    .userNames(names)
                    .build());
        }

        // Sort by count descending
        result.sort((a, b) -> Long.compare(b.getCount(), a.getCount()));
        return result;
    }
}
