package com.memoryverse.modules.media;

import com.memoryverse.common.api.PagedResponse;
import com.memoryverse.config.RedisConfig;
import jakarta.persistence.criteria.Join;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GalleryService {

    private final MediaRepository mediaRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_GALLERY, key = "{#journeyId, #sectionId, #mediaType, #taggedUserId, #pageable.pageNumber, #pageable.pageSize}")
    public PagedResponse<GalleryItemDto> getGalleryItems(UUID journeyId, UUID sectionId, MediaType mediaType, UUID taggedUserId, Pageable pageable) {
        log.info("Fetching gallery items: journey={}, section={}, type={}, taggedUser={}, page={}",
                journeyId, sectionId, mediaType, taggedUserId, pageable.getPageNumber());

        Specification<Media> spec = Specification.where(null);

        if (mediaType != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("mediaType"), mediaType));
        }

        if (journeyId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("memory").get("journey").get("id"), journeyId));
        }

        if (sectionId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("memory").get("section").get("id"), sectionId));
        }

        if (taggedUserId != null) {
            spec = spec.and((root, query, cb) -> {
                query.distinct(true);
                Join<Object, Object> taggedUsers = root.join("memory").join("taggedUsers");
                return cb.equal(taggedUsers.get("id"), taggedUserId);
            });
        }

        Page<Media> page = mediaRepository.findAll(spec, pageable);

        return PagedResponse.<GalleryItemDto>builder()
                .content(page.getContent().stream().map(GalleryItemDto::fromEntity).toList())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }
}
