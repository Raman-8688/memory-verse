package com.memoryverse.service;

import com.memoryverse.dto.request.CollectionCreateDto;
import com.memoryverse.dto.request.CollectionUpdateDto;
import com.memoryverse.dto.response.CollectionResponseDto;
import com.memoryverse.dto.response.MemoryResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface CollectionService {

    List<CollectionResponseDto> getAllCollections();

    CollectionResponseDto getCollectionById(UUID id);

    CollectionResponseDto createCollection(CollectionCreateDto dto, UUID creatorId);

    CollectionResponseDto updateCollection(UUID id, CollectionUpdateDto dto, UUID currentUserId);

    void deleteCollection(UUID id, UUID currentUserId);

    void addMemoryToCollection(UUID collectionId, UUID memoryId, UUID currentUserId);

    void removeMemoryFromCollection(UUID collectionId, UUID memoryId, UUID currentUserId);

    PagedResponse<MemoryResponseDto> getCollectionMemories(UUID collectionId, Pageable pageable);
}
