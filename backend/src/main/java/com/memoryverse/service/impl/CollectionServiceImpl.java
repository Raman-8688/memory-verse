package com.memoryverse.service.impl;

import com.memoryverse.dto.request.CollectionCreateDto;
import com.memoryverse.dto.request.CollectionUpdateDto;
import com.memoryverse.dto.response.CollectionResponseDto;
import com.memoryverse.dto.response.MemoryResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.entity.Memory;
import com.memoryverse.entity.MemoryCollection;
import com.memoryverse.entity.User;
import com.memoryverse.exception.ForbiddenException;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.repository.CollectionRepository;
import com.memoryverse.repository.MemoryRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.service.CollectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CollectionServiceImpl implements CollectionService {

    private final CollectionRepository collectionRepository;
    private final MemoryRepository memoryRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CollectionResponseDto> getAllCollections() {
        return collectionRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(CollectionResponseDto::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CollectionResponseDto getCollectionById(UUID id) {
        MemoryCollection collection = collectionRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", "id", id));
        return CollectionResponseDto.fromEntity(collection);
    }

    @Override
    @Transactional
    public CollectionResponseDto createCollection(CollectionCreateDto dto, UUID creatorId) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", creatorId));

        MemoryCollection collection = MemoryCollection.builder()
                .title(dto.getTitle().trim())
                .description(dto.getDescription() != null ? dto.getDescription().trim() : null)
                .coverImageUrl(dto.getCoverImageUrl() != null ? dto.getCoverImageUrl().trim() : null)
                .createdBy(creator)
                .build();

        if (dto.getInitialMemoryIds() != null && !dto.getInitialMemoryIds().isEmpty()) {
            List<Memory> memories = memoryRepository.findAllById(dto.getInitialMemoryIds());
            collection.setMemories(new HashSet<>(memories));
        }

        MemoryCollection saved = collectionRepository.save(collection);
        log.info("Created collection {} by user {}", saved.getId(), creatorId);
        return CollectionResponseDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public CollectionResponseDto updateCollection(UUID id, CollectionUpdateDto dto, UUID currentUserId) {
        MemoryCollection collection = collectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", "id", id));

        collection.setTitle(dto.getTitle().trim());
        if (dto.getDescription() != null) {
            collection.setDescription(dto.getDescription().trim());
        }
        if (dto.getCoverImageUrl() != null) {
            collection.setCoverImageUrl(dto.getCoverImageUrl().trim());
        }

        MemoryCollection updated = collectionRepository.save(collection);
        log.info("Updated collection {} by user {}", id, currentUserId);
        return CollectionResponseDto.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteCollection(UUID id, UUID currentUserId) {
        MemoryCollection collection = collectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", "id", id));

        collectionRepository.delete(collection);
        log.info("Deleted collection {} by user {}", id, currentUserId);
    }

    @Override
    @Transactional
    public void addMemoryToCollection(UUID collectionId, UUID memoryId, UUID currentUserId) {
        MemoryCollection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", "id", collectionId));
        Memory memory = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", "id", memoryId));

        collection.addMemory(memory);
        collectionRepository.save(collection);
        log.info("Added memory {} to collection {}", memoryId, collectionId);
    }

    @Override
    @Transactional
    public void removeMemoryFromCollection(UUID collectionId, UUID memoryId, UUID currentUserId) {
        MemoryCollection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", "id", collectionId));
        Memory memory = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", "id", memoryId));

        collection.removeMemory(memory);
        collectionRepository.save(collection);
        log.info("Removed memory {} from collection {}", memoryId, collectionId);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<MemoryResponseDto> getCollectionMemories(UUID collectionId, Pageable pageable) {
        MemoryCollection collection = collectionRepository.findWithDetailsById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", "id", collectionId));

        List<Memory> allMemories = new ArrayList<>(collection.getMemories());
        allMemories.sort((m1, m2) -> m2.getMemoryDate().compareTo(m1.getMemoryDate()));

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), allMemories.size());

        List<MemoryResponseDto> pagedContent = start <= end
                ? allMemories.subList(start, end).stream().map(MemoryResponseDto::fromEntity).toList()
                : Collections.emptyList();

        Page<MemoryResponseDto> page = new PageImpl<>(pagedContent, pageable, allMemories.size());

        return PagedResponse.<MemoryResponseDto>builder()
                .content(page.getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }
}
