package com.memoryverse.service.impl;

import com.memoryverse.config.RedisConfig;
import com.memoryverse.dto.response.GalleryItemDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.entity.Media;
import com.memoryverse.entity.MediaType;
import com.memoryverse.repository.MediaRepository;
import com.memoryverse.service.GalleryService;
import jakarta.persistence.criteria.Join;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GalleryServiceImpl implements GalleryService {

    private final MediaRepository mediaRepository;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_GALLERY, key = "{#journeyId, #sectionId, #mediaType, #taggedUserId, #pageable.pageNumber, #pageable.pageSize, #pageable.sort.toString()}")
    public PagedResponse<GalleryItemDto> getGalleryItems(UUID journeyId, UUID sectionId, MediaType mediaType, UUID taggedUserId, Pageable pageable) {
        log.info("Fetching gallery items: journey={}, section={}, type={}, taggedUser={}, page={}",
                journeyId, sectionId, mediaType, taggedUserId, pageable.getPageNumber());

        Pageable effectivePageable = sanitizePageable(pageable);

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

        Page<Media> page = mediaRepository.findAll(spec, effectivePageable);

        return PagedResponse.<GalleryItemDto>builder()
                .content(page.getContent().stream().map(GalleryItemDto::fromEntity).toList())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    private Pageable sanitizePageable(Pageable pageable) {
        if (pageable == null || pageable.getSort().isUnsorted()) {
            return pageable;
        }

        List<Sort.Order> mappedOrders = new ArrayList<>();
        for (Sort.Order order : pageable.getSort()) {
            String property = order.getProperty();
            if ("memoryDate".equalsIgnoreCase(property) || "date".equalsIgnoreCase(property)) {
                mappedOrders.add(new Sort.Order(order.getDirection(), "memory.memoryDate"));
            } else if ("journey".equalsIgnoreCase(property) || "journeyTitle".equalsIgnoreCase(property)) {
                mappedOrders.add(new Sort.Order(order.getDirection(), "memory.journey.title"));
            } else if ("section".equalsIgnoreCase(property) || "sectionTitle".equalsIgnoreCase(property)) {
                mappedOrders.add(new Sort.Order(order.getDirection(), "memory.section.title"));
            } else {
                mappedOrders.add(order);
            }
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(mappedOrders));
    }
}
