package com.memoryverse.service;

import com.memoryverse.dto.request.MemoryCreateDto;
import com.memoryverse.dto.request.MemoryUpdateDto;
import com.memoryverse.dto.response.MemoryResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface MemoryService {

    MemoryResponseDto createMemory(MemoryCreateDto dto, List<MultipartFile> files, UUID creatorId);

    PagedResponse<MemoryResponseDto> getMemoriesTaggedWithUser(UUID userId, Pageable pageable);

    PagedResponse<MemoryResponseDto> getMemories(UUID journeyId, UUID sectionId, String search, Integer year, Integer month, UUID userId, Pageable pageable);

    List<Integer> getAvailableYears();

    MemoryResponseDto getMemoryById(UUID id);

    MemoryResponseDto updateMemory(UUID memoryId, MemoryUpdateDto dto, UUID currentUserId);

    MemoryResponseDto appendMedia(UUID memoryId, List<MultipartFile> files, UUID currentUserId);
}
