package com.memoryverse.modules.ai.retrieval;

import com.memoryverse.modules.ai.dto.AiChatResponseDto;
import com.memoryverse.modules.ai.dto.AiMemorySummaryDto;
import com.memoryverse.modules.ai.dto.MemorySearchCriteria;
import com.memoryverse.modules.media.Media;
import com.memoryverse.modules.media.MediaType;
import com.memoryverse.modules.memory.Memory;
import com.memoryverse.modules.memory.MemoryRepository;
import com.memoryverse.modules.memory.MemorySpecification;
import com.memoryverse.modules.user.User;
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
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemoryRetrievalService {

    private final MemoryRepository memoryRepository;

    private static final int DEFAULT_MAX_RETRIEVAL = 10;

    /**
     * Executes dynamic, type-safe JPA Specification queries against PostgreSQL
     * and maps results into lightweight AI context summaries.
     * Guaranteed ZERO raw SQL.
     */
    @Transactional(readOnly = true)
    public List<AiMemorySummaryDto> retrieveMemories(MemorySearchCriteria criteria) {
        return retrieveMemories(criteria, DEFAULT_MAX_RETRIEVAL);
    }

    @Transactional(readOnly = true)
    public List<AiMemorySummaryDto> retrieveMemories(MemorySearchCriteria criteria, int maxResults) {
        if (criteria == null || "GENERAL".equalsIgnoreCase(criteria.getMode())) {
            log.debug("Skipping memory retrieval for null criteria or GENERAL mode");
            return Collections.emptyList();
        }

        Specification<Memory> spec = MemorySpecification.withCriteria(criteria);
        PageRequest pageRequest = PageRequest.of(0, maxResults, Sort.by(Sort.Direction.DESC, "memoryDate"));

        log.info("Executing Memory retrieval query for criteria: keywords={}, journey={}, section={}, dates=[{} to {}]",
                criteria.getKeywords(), criteria.getJourneyName(), criteria.getSectionName(),
                criteria.getStartDate(), criteria.getEndDate());

        Page<Memory> page = memoryRepository.findAll(spec, pageRequest);
        List<Memory> memories = page.getContent();

        log.info("Memory retrieval matched {} records in PostgreSQL", memories.size());

        return memories.stream()
                .map(this::mapToSummaryDto)
                .collect(Collectors.toList());
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
