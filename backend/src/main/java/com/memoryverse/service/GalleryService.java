package com.memoryverse.service;

import com.memoryverse.dto.response.GalleryItemDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.entity.MediaType;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface GalleryService {

    PagedResponse<GalleryItemDto> getGalleryItems(UUID journeyId, UUID sectionId, MediaType mediaType, UUID taggedUserId, Pageable pageable);
}
