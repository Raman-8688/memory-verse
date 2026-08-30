package com.memoryverse.modules.media;

import com.memoryverse.common.api.ApiResponse;
import com.memoryverse.common.api.PageRequestDto;
import com.memoryverse.common.api.PagedResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/gallery")
@RequiredArgsConstructor
public class GalleryController {

    private final GalleryService galleryService;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<GalleryItemDto>>> getGallery(
            @RequestParam(required = false) UUID journeyId,
            @RequestParam(required = false) UUID sectionId,
            @RequestParam(required = false) MediaType mediaType,
            @RequestParam(required = false) UUID taggedUserId,
            @Valid PageRequestDto pageRequest) {

        PagedResponse<GalleryItemDto> response = galleryService.getGalleryItems(
                journeyId, sectionId, mediaType, taggedUserId, pageRequest.toPageable());

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
