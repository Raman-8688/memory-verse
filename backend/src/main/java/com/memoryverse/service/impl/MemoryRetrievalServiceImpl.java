package com.memoryverse.service.impl;

import com.memoryverse.dto.request.MemorySearchCriteria;
import com.memoryverse.dto.response.AiChatResponseDto;
import com.memoryverse.dto.response.AiMemorySummaryDto;
import com.memoryverse.entity.Media;
import com.memoryverse.entity.MediaType;
import com.memoryverse.entity.Memory;
import com.memoryverse.entity.User;
import com.memoryverse.repository.MemoryRepository;
import com.memoryverse.repository.specification.MemorySpecification;
import com.memoryverse.service.MemoryRetrievalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemoryRetrievalServiceImpl implements MemoryRetrievalService {

    private final MemoryRepository memoryRepository;

    private static final int DEFAULT_MAX_RETRIEVAL = 10;

    /**
     * Executes dynamic, type-safe JPA Specification queries against PostgreSQL
     * and maps results into lightweight AI context summaries.
     * Guaranteed ZERO raw SQL.
     */
    private static final Set<String> META_STOP_WORDS = Set.of(
            "recent", "recently", "updated", "update", "latest", "new", "newest",
            "any", "all", "some", "show", "tell", "photos", "photo", "image", "images",
            "picture", "pictures", "video", "videos", "media", "memories", "memory"
    );

    @Override
    @Transactional(readOnly = true)
    public List<AiMemorySummaryDto> retrieveMemories(MemorySearchCriteria criteria) {
        return retrieveMemories(criteria, DEFAULT_MAX_RETRIEVAL);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiMemorySummaryDto> retrieveMemories(MemorySearchCriteria criteria, int maxResults) {
        if (criteria == null || "GENERAL".equalsIgnoreCase(criteria.getMode())) {
            log.debug("Skipping memory retrieval for null criteria or GENERAL mode");
            return Collections.emptyList();
        }

        // Clean out temporal/meta words from keywords (e.g. "recent", "photos", "updated")
        MemorySearchCriteria cleanedCriteria = sanitizeCriteria(criteria);

        Specification<Memory> spec = MemorySpecification.withCriteria(cleanedCriteria);
        PageRequest pageRequest = PageRequest.of(0, maxResults, Sort.by(Sort.Direction.DESC, "memoryDate", "createdAt"));

        log.info("Executing Memory retrieval query for criteria: keywords={}, journey={}, section={}, dates=[{} to {}]",
                cleanedCriteria.getKeywords(), cleanedCriteria.getJourneyName(), cleanedCriteria.getSectionName(),
                cleanedCriteria.getStartDate(), cleanedCriteria.getEndDate());

        Page<Memory> page = memoryRepository.findAll(spec, pageRequest);
        List<Memory> memories = page.getContent();

        // If specific keyword search returned 0 results, try fetching recent memories
        if (memories.isEmpty() && (cleanedCriteria.getKeywords() != null && !cleanedCriteria.getKeywords().isEmpty())) {
            log.info("Keyword-specific search yielded 0 results, attempting fallback to latest available memories");
            PageRequest fallbackPage = PageRequest.of(0, maxResults, Sort.by(Sort.Direction.DESC, "memoryDate", "createdAt"));
            Page<Memory> fallback = memoryRepository.findAll(fallbackPage);
            memories = fallback.getContent();
        }

        log.info("Memory retrieval matched {} records in PostgreSQL", memories.size());

        return memories.stream()
                .map(this::mapToSummaryDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiMemorySummaryDto> retrieveRecentMemories(int maxResults) {
        PageRequest pageRequest = PageRequest.of(0, maxResults, Sort.by(Sort.Direction.DESC, "memoryDate", "createdAt"));
        Page<Memory> page = memoryRepository.findAll(pageRequest);
        return page.getContent().stream()
                .map(this::mapToSummaryDto)
                .collect(Collectors.toList());
    }

    private MemorySearchCriteria sanitizeCriteria(MemorySearchCriteria original) {
        if (original.getKeywords() == null || original.getKeywords().isEmpty()) {
            return original;
        }

        List<String> contentKeywords = original.getKeywords().stream()
                .map(String::trim)
                .filter(k -> !k.isBlank() && !META_STOP_WORDS.contains(k.toLowerCase()))
                .collect(Collectors.toList());

        return MemorySearchCriteria.builder()
                .mode(original.getMode())
                .mediaType(original.getMediaType())
                .keywords(contentKeywords)
                .journeyName(original.getJourneyName())
                .sectionName(original.getSectionName())
                .startDate(original.getStartDate())
                .endDate(original.getEndDate())
                .location(original.getLocation())
                .taggedFriendNames(original.getTaggedFriendNames())
                .featuredOnly(null) // Never artificially restrict to featured-only unless explicitly requested
                .build();
    }

    private AiMemorySummaryDto mapToSummaryDto(Memory memory) {
        // Safe story truncation to keep prompt tokens tight and prevent context overflow
        String story = memory.getStory() != null ? memory.getStory().trim() : "";
        String storySummary = story.length() > 300 ? story.substring(0, 297) + "..." : story;

        List<String> taggedFriends = memory.getTaggedUsers() != null
                ? memory.getTaggedUsers().stream().map(User::getFullName).toList()
                : Collections.emptyList();

        int photoCount = 0;
        int videoCount = 0;
        List<AiMemorySummaryDto.AiMediaItemDto> mediaItems = new ArrayList<>();

        if (memory.getMediaList() != null) {
            for (Media media : memory.getMediaList()) {
                if (media.getMediaType() == MediaType.IMAGE) {
                    photoCount++;
                } else if (media.getMediaType() == MediaType.VIDEO) {
                    videoCount++;
                }
                mediaItems.add(AiMemorySummaryDto.AiMediaItemDto.builder()
                        .id(media.getId())
                        .mediaType(media.getMediaType().name())
                        .mediaUrl(media.getMediaUrl())
                        .thumbnailUrl(media.getThumbnailUrl() != null ? media.getThumbnailUrl() : media.getMediaUrl())
                        .fileName(media.getFileName())
                        .durationSeconds(media.getDurationSeconds())
                        .build());
            }
        }

        return AiMemorySummaryDto.builder()
                .id(memory.getId())
                .title(memory.getTitle())
                .storySummary(storySummary)
                .memoryDate(memory.getMemoryDate())
                .locationName(memory.getLocationName())
                .journeyTitle(memory.getJourney() != null ? memory.getJourney().getTitle() : null)
                .sectionTitle(memory.getSection() != null ? memory.getSection().getTitle() : null)
                .createdByName(memory.getCreatedBy() != null ? memory.getCreatedBy().getFullName() : null)
                .isFeatured(Boolean.TRUE.equals(memory.getIsFeatured()))
                .taggedFriends(taggedFriends)
                .photoCount(photoCount)
                .videoCount(videoCount)
                .mediaItems(mediaItems)
                .build();
    }

    @Override
    public List<AiChatResponseDto.RelatedMemoryDto> toRelatedMemoryDtos(List<AiMemorySummaryDto> summaries) {
        if (summaries == null) return Collections.emptyList();

        return summaries.stream().map(summary -> {
            String coverUrl = null;
            if (!summary.getMediaItems().isEmpty()) {
                coverUrl = summary.getMediaItems().get(0).getThumbnailUrl();
            }
            return AiChatResponseDto.RelatedMemoryDto.builder()
                .id(summary.getId())
                .title(summary.getTitle())
                .story(summary.getStorySummary())
                .memoryDate(summary.getMemoryDate())
                .locationName(summary.getLocationName())
                .journeyTitle(summary.getJourneyTitle())
                .sectionTitle(summary.getSectionTitle())
                .coverImageUrl(coverUrl)
                .mediaCount(summary.getPhotoCount() + summary.getVideoCount())
                .build();
        }).collect(Collectors.toList());
    }

    @Override
    public List<AiChatResponseDto.RelatedMediaDto> toRelatedMediaDtos(List<AiMemorySummaryDto> summaries) {
        if (summaries == null) return Collections.emptyList();

        List<AiChatResponseDto.RelatedMediaDto> mediaDtos = new ArrayList<>();
        for (AiMemorySummaryDto summary : summaries) {
            for (AiMemorySummaryDto.AiMediaItemDto item : summary.getMediaItems()) {
                mediaDtos.add(AiChatResponseDto.RelatedMediaDto.builder()
                        .id(item.getId())
                        .mediaType(item.getMediaType())
                        .mediaUrl(item.getMediaUrl())
                        .thumbnailUrl(item.getThumbnailUrl())
                        .fileName(item.getFileName())
                        .durationSeconds(item.getDurationSeconds())
                        .memoryId(summary.getId())
                        .memoryTitle(summary.getTitle())
                        .build());
            }
        }
        return mediaDtos;
    }
}
