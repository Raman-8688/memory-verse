package com.memoryverse.service.impl;

import com.memoryverse.config.RedisConfig;
import com.memoryverse.dto.request.MemoryCreateDto;
import com.memoryverse.dto.request.MemoryUpdateDto;
import com.memoryverse.dto.response.MemoryResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.dto.response.PlaceSummaryDto;
import com.memoryverse.dto.response.UploadedMediaResult;
import com.memoryverse.entity.Journey;
import com.memoryverse.entity.JourneySection;
import com.memoryverse.entity.Media;
import com.memoryverse.entity.MediaType;
import com.memoryverse.entity.Memory;
import com.memoryverse.entity.NotificationType;
import com.memoryverse.entity.PrivacyLevel;
import com.memoryverse.entity.User;
import com.memoryverse.exception.ForbiddenException;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.integration.storage.CloudinaryStorageService;
import com.memoryverse.repository.JourneyRepository;
import com.memoryverse.repository.JourneySectionRepository;
import com.memoryverse.repository.MemoryRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.MemoryService;
import com.memoryverse.service.NotificationService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import com.memoryverse.dto.response.RelatedMemoryResponseDto;
import com.memoryverse.repository.specification.MemorySpecification;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemoryServiceImpl implements MemoryService {

    private final MemoryRepository memoryRepository;
    private final JourneyRepository journeyRepository;
    private final JourneySectionRepository journeySectionRepository;
    private final UserRepository userRepository;
    private final CloudinaryStorageService cloudinaryStorageService;
    private final NotificationService notificationService;
    private final EntityManager entityManager;

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_PLACES, RedisConfig.CACHE_PEOPLE, RedisConfig.CACHE_DASHBOARD, RedisConfig.CACHE_GALLERY}, allEntries = true)
    public MemoryResponseDto createMemory(MemoryCreateDto dto, List<MultipartFile> files, UUID creatorId) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", creatorId));

        Journey journey = journeyRepository.findById(dto.getJourneyId())
                .orElseThrow(() -> new ResourceNotFoundException("Journey", "id", dto.getJourneyId()));

        JourneySection section = null;
        if (dto.getSectionId() != null) {
            section = journeySectionRepository.findById(dto.getSectionId())
                    .orElse(null);
        }

        Memory memory = Memory.builder()
                .title(dto.getTitle().trim())
                .story(dto.getStory().trim())
                .memoryDate(dto.getMemoryDate())
                .coverImageUrl(dto.getCoverImageUrl() != null && !dto.getCoverImageUrl().isBlank() ? dto.getCoverImageUrl().trim() : null)
                .locationName(dto.getLocationName())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .isFeatured(dto.getIsFeatured() != null ? dto.getIsFeatured() : false)
                .privacyLevel(dto.getPrivacyLevel() != null ? dto.getPrivacyLevel() : PrivacyLevel.CIRCLE_COMPANIONS)
                .journey(journey)
                .section(section)
                .createdBy(creator)
                .build();

        // Tag Friends
        if (dto.getTaggedUserIds() != null && !dto.getTaggedUserIds().isEmpty()) {
            List<User> taggedUsers = userRepository.findAllById(dto.getTaggedUserIds());
            taggedUsers.forEach(memory::tagUser);
        }

        // Upload Media Files (with deduplication)
        int displayOrder = 1;
        if (files != null && !files.isEmpty()) {
            java.util.Set<String> seenUploads = new java.util.HashSet<>();
            for (MultipartFile file : files) {
                if (file != null && !file.isEmpty()) {
                    String signature = (file.getOriginalFilename() != null ? file.getOriginalFilename() : "file") + "_" + file.getSize();
                    if (!seenUploads.add(signature)) {
                        log.info("Skipping duplicate media file during memory creation: {}", file.getOriginalFilename());
                        continue;
                    }
                    UploadedMediaResult uploaded = cloudinaryStorageService.uploadFile(file);
                    Media media = Media.builder()
                            .mediaUrl(uploaded.getMediaUrl())
                            .thumbnailUrl(uploaded.getThumbnailUrl())
                            .mediaType(uploaded.getMediaType())
                            .publicId(uploaded.getPublicId())
                            .fileName(uploaded.getFileName())
                            .fileSizeBytes(uploaded.getFileSizeBytes())
                            .width(uploaded.getWidth())
                            .height(uploaded.getHeight())
                            .durationSeconds(uploaded.getDurationSeconds())
                            .displayOrder(displayOrder++)
                            .build();
                    memory.addMedia(media);
                }
            }
        }

        // External direct image URLs (e.g. from preset galleries)
        if (dto.getExternalImageUrls() != null && !dto.getExternalImageUrls().isEmpty()) {
            for (String url : dto.getExternalImageUrls()) {
                if (url != null && !url.isBlank()) {
                    Media media = Media.builder()
                            .mediaUrl(url)
                            .thumbnailUrl(url)
                            .mediaType(MediaType.IMAGE)
                            .fileName("photo.jpg")
                            .displayOrder(displayOrder++)
                            .build();
                    memory.addMedia(media);
                }
            }
        }

        Memory savedMemory = memoryRepository.save(memory);
        log.info("Created memory: id={}, title='{}', mediaCount={}", savedMemory.getId(), savedMemory.getTitle(), savedMemory.getMediaList().size());

        // Broadcast to group and notify tagged users
        notificationService.notifyGroup(
                creator,
                String.format("You preserved a new memory: '%s'", savedMemory.getTitle()),
                String.format("%s preserved a new memory: '%s'", creator.getFullName(), savedMemory.getTitle()),
                NotificationType.MEMORY_CREATED,
                savedMemory.getId()
        );

        if (savedMemory.getTaggedUsers() != null) {
            for (User taggedUser : savedMemory.getTaggedUsers()) {
                if (!taggedUser.getId().equals(creator.getId())) {
                    String notificationMsg = String.format("%s tagged you in a new memory: '%s'",
                            creator.getFullName(), savedMemory.getTitle());
                    notificationService.createNotification(taggedUser, notificationMsg, NotificationType.TAGGED, savedMemory.getId());
                }
            }
        }

        return MemoryResponseDto.fromEntity(savedMemory);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<MemoryResponseDto> getMemoriesTaggedWithUser(UUID userId, Pageable pageable) {
        Page<Memory> page = memoryRepository.findMemoriesTaggedWithUser(userId, pageable);
        return PagedResponse.<MemoryResponseDto>builder()
                .content(page.getContent().stream().map(MemoryResponseDto::fromEntity).toList())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<MemoryResponseDto> getMemories(UUID journeyId, UUID sectionId, String search, Integer year, Integer month, UUID userId, Boolean isFavorite, String place, Pageable pageable) {
        Specification<Memory> spec = Specification.where(null);

        if (journeyId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("journey").get("id"), journeyId));
        }

        if (sectionId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("section").get("id"), sectionId));
        }

        if (year != null) {
            if (month != null) {
                LocalDate start = LocalDate.of(year, month, 1);
                LocalDate end = start.plusMonths(1).minusDays(1);
                spec = spec.and((root, query, cb) -> cb.between(root.get("memoryDate"), start, end));
            } else {
                LocalDate start = LocalDate.of(year, 1, 1);
                LocalDate end = LocalDate.of(year, 12, 31);
                spec = spec.and((root, query, cb) -> cb.between(root.get("memoryDate"), start, end));
            }
        } else if (month != null) {
            spec = spec.and((root, query, cb) -> cb.equal(
                    cb.function("to_char", String.class, root.get("memoryDate"), cb.literal("MM")),
                    String.format("%02d", month)
            ));
        }

        if (userId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.join("taggedUsers").get("id"), userId));
        }

        if (Boolean.TRUE.equals(isFavorite)) {
            spec = spec.and((root, query, cb) -> cb.isTrue(root.get("isFavorite")));
        }

        if (place != null && !place.isBlank()) {
            String p = "%" + place.toLowerCase().trim() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("locationName")), p));
        }

        if (search != null && !search.isBlank()) {
            String term = "%" + search.toLowerCase().trim() + "%";
            spec = spec.and((root, query, cb) -> {
                query.distinct(true);
                return cb.or(
                        cb.like(cb.lower(root.get("title")), term),
                        cb.like(cb.lower(root.get("story")), term),
                        cb.like(cb.lower(root.get("locationName")), term),
                        cb.like(cb.lower(root.join("taggedUsers", jakarta.persistence.criteria.JoinType.LEFT).get("fullName")), term),
                        cb.like(cb.lower(root.join("createdBy", jakarta.persistence.criteria.JoinType.LEFT).get("fullName")), term)
                );
            });
        }


        Page<Memory> page = memoryRepository.findAll(spec, pageable);
        return PagedResponse.<MemoryResponseDto>builder()
                .content(page.getContent().stream().map(MemoryResponseDto::fromEntity).toList())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Integer> getAvailableYears() {
        return memoryRepository.findDistinctMemoryYears();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlaceSummaryDto> getPlacesSummary() {
        return memoryRepository.findPlacesSummary().stream()
                .map(p -> PlaceSummaryDto.builder()
                        .locationName(p.getLocationName())
                        .memoryCount(p.getMemoryCount() != null ? p.getMemoryCount() : 0)
                        .latestMemoryDate(p.getLatestMemoryDate())
                        .latitude(p.getLatitude())
                        .longitude(p.getLongitude())
                        .coverImageUrl(p.getCoverImageUrl())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_PLACES, key = "#userId")
    public List<PlaceSummaryDto> getPlacesSummary(UUID userId) {
        log.debug("Fetching places summary for user {} (cache miss)", userId);
        return getPlacesSummary();
    }

    @Override
    @Transactional
    public MemoryResponseDto toggleFavorite(UUID memoryId, UUID currentUserId) {
        Memory memory = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", "id", memoryId));

        boolean newFavorite = !Boolean.TRUE.equals(memory.getIsFavorite());
        memory.setIsFavorite(newFavorite);
        Memory saved = memoryRepository.save(memory);
        log.info("Toggled memory {} favorite to {} by user {}", memoryId, newFavorite, currentUserId);
        return MemoryResponseDto.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public MemoryResponseDto getMemoryById(UUID id) {
        Memory memory = memoryRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", "id", id));
        return MemoryResponseDto.fromEntity(memory);
    }

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_PLACES, RedisConfig.CACHE_PEOPLE, RedisConfig.CACHE_DASHBOARD, RedisConfig.CACHE_GALLERY}, allEntries = true)
    public MemoryResponseDto updateMemory(UUID memoryId, MemoryUpdateDto dto, UUID currentUserId) {
        Memory memory = memoryRepository.findWithDetailsById(memoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", "id", memoryId));

        boolean isCreator = memory.getCreatedBy() != null && memory.getCreatedBy().getId().equals(currentUserId);
        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        if (!isCreator && !isAdmin) {
            throw new ForbiddenException("You do not have permission to update this memory");
        }

        memory.setTitle(dto.getTitle().trim());
        memory.setStory(dto.getStory().trim());
        memory.setMemoryDate(dto.getMemoryDate());
        if (dto.getCoverImageUrl() != null) {
            memory.setCoverImageUrl(dto.getCoverImageUrl().isBlank() ? null : dto.getCoverImageUrl().trim());
        }
        memory.setLocationName(dto.getLocationName() != null ? dto.getLocationName().trim() : null);
        if (dto.getPrivacyLevel() != null) {
            memory.setPrivacyLevel(dto.getPrivacyLevel());
        }
        if (dto.getTaggedUserIds() != null && !dto.getTaggedUserIds().isEmpty()) {
            List<User> newTaggedUsers = userRepository.findAllById(dto.getTaggedUserIds());
            memory.setTaggedUsers(new java.util.HashSet<>(newTaggedUsers));
        }

        Memory updated = memoryRepository.save(memory);
        log.info("Memory updated: id={}, title='{}'", updated.getId(), updated.getTitle());

        User updater = userRepository.findById(currentUserId).orElse(null);
        String updaterName = updater != null ? updater.getFullName() : "A friend";
        notificationService.notifyGroup(
                updater,
                String.format("You updated memory: '%s'", updated.getTitle()),
                String.format("%s updated the memory '%s'", updaterName, updated.getTitle()),
                NotificationType.MEMORY_UPDATED,
                updated.getId()
        );

        if (updated.getTaggedUsers() != null) {
            for (User taggedUser : updated.getTaggedUsers()) {
                if (updater == null || !taggedUser.getId().equals(updater.getId())) {
                    String notificationMsg = String.format("%s tagged you in the memory: '%s'",
                            updaterName, updated.getTitle());
                    notificationService.createNotification(taggedUser, notificationMsg, NotificationType.NEW_TAG, updated.getId());
                }
            }
        }

        return MemoryResponseDto.fromEntity(updated);
    }

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_PLACES, RedisConfig.CACHE_PEOPLE, RedisConfig.CACHE_DASHBOARD, RedisConfig.CACHE_GALLERY}, allEntries = true)
    public MemoryResponseDto appendMedia(UUID memoryId, List<MultipartFile> files, UUID currentUserId) {
        Memory memory = memoryRepository.findWithDetailsById(memoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", "id", memoryId));

        boolean isCreator = memory.getCreatedBy() != null && memory.getCreatedBy().getId().equals(currentUserId);
        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        if (!isCreator && !isAdmin) {
            throw new ForbiddenException("You do not have permission to append media to this memory");
        }

        if (files == null || files.isEmpty()) {
            return MemoryResponseDto.fromEntity(memory);
        }

        int displayOrder = memory.getMediaList().stream()
                .mapToInt(Media::getDisplayOrder)
                .max()
                .orElse(0) + 1;

        java.util.Set<String> existingSignatures = new java.util.HashSet<>();
        for (Media existing : memory.getMediaList()) {
            if (existing.getFileName() != null && existing.getFileSizeBytes() != null) {
                existingSignatures.add(existing.getFileName() + "_" + existing.getFileSizeBytes());
            }
        }

        int addedCount = 0;
        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty()) {
                String signature = (file.getOriginalFilename() != null ? file.getOriginalFilename() : "file") + "_" + file.getSize();
                if (!existingSignatures.add(signature)) {
                    log.info("Skipping duplicate media file during appendMedia: {}", file.getOriginalFilename());
                    continue;
                }
                UploadedMediaResult uploaded = cloudinaryStorageService.uploadFile(file);
                Media media = Media.builder()
                        .mediaUrl(uploaded.getMediaUrl())
                        .thumbnailUrl(uploaded.getThumbnailUrl())
                        .mediaType(uploaded.getMediaType())
                        .publicId(uploaded.getPublicId())
                        .fileName(uploaded.getFileName())
                        .fileSizeBytes(uploaded.getFileSizeBytes())
                        .width(uploaded.getWidth())
                        .height(uploaded.getHeight())
                        .durationSeconds(uploaded.getDurationSeconds())
                        .displayOrder(displayOrder++)
                        .build();
                memory.addMedia(media);
                addedCount++;
            }
        }

        Memory updated = memoryRepository.save(memory);
        log.info("Appended {} media files to memory id={}, total media={}", addedCount, updated.getId(), updated.getMediaList().size());

        if (addedCount > 0) {
            User updater = userRepository.findById(currentUserId).orElse(null);
            String updaterName = updater != null ? updater.getFullName() : "A friend";
            String photoWord = addedCount == 1 ? "photo" : "photos";
            notificationService.notifyGroup(
                    updater,
                    String.format("You added %d new %s to '%s'", addedCount, photoWord, updated.getTitle()),
                    String.format("%s added %d new %s to '%s'", updaterName, addedCount, photoWord, updated.getTitle()),
                    NotificationType.MEDIA_ADDED,
                    updated.getId()
            );
        }

        return MemoryResponseDto.fromEntity(updated);
    }

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_PLACES, RedisConfig.CACHE_PEOPLE, RedisConfig.CACHE_DASHBOARD, RedisConfig.CACHE_GALLERY}, allEntries = true)
    public void deleteMemory(UUID memoryId, boolean permanent, UUID currentUserId) {
        Memory memory = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", "id", memoryId));

        boolean isCreator = memory.getCreatedBy() != null && memory.getCreatedBy().getId().equals(currentUserId);
        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        if (!isCreator && !isAdmin) {
            throw new ForbiddenException("You do not have permission to delete this memory");
        }

        if (permanent) {
            log.info("Permanently deleting memory id={} by user={}", memoryId, currentUserId);
            for (Media media : memory.getMediaList()) {
                if (media.getPublicId() != null) {
                    cloudinaryStorageService.deleteFile(media.getPublicId(), media.getMediaType());
                }
            }
            entityManager.createNativeQuery("DELETE FROM memory_comments WHERE memory_id = :id")
                    .setParameter("id", memoryId).executeUpdate();
            entityManager.createNativeQuery("DELETE FROM memory_reactions WHERE memory_id = :id")
                    .setParameter("id", memoryId).executeUpdate();
            entityManager.createNativeQuery("DELETE FROM memory_tagged_users WHERE memory_id = :id")
                    .setParameter("id", memoryId).executeUpdate();
            entityManager.createNativeQuery("DELETE FROM media WHERE memory_id = :id")
                    .setParameter("id", memoryId).executeUpdate();
            entityManager.createNativeQuery("DELETE FROM memories WHERE id = :id")
                    .setParameter("id", memoryId).executeUpdate();
        } else {
            log.info("Soft deleting (moving to trash) memory id={} by user={}", memoryId, currentUserId);
            memoryRepository.delete(memory);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_PLACES, RedisConfig.CACHE_PEOPLE, RedisConfig.CACHE_DASHBOARD, RedisConfig.CACHE_GALLERY}, allEntries = true)
    public void deleteMedia(UUID memoryId, UUID mediaId, UUID currentUserId) {
        Memory memory = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", "id", memoryId));

        boolean isCreator = memory.getCreatedBy() != null && memory.getCreatedBy().getId().equals(currentUserId);
        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        if (!isCreator && !isAdmin) {
            throw new ForbiddenException("You do not have permission to delete media from this memory");
        }

        Media toRemove = memory.getMediaList().stream()
                .filter(m -> m.getId() != null && m.getId().equals(mediaId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Media", "id", mediaId));

        if (toRemove.getPublicId() != null) {
            cloudinaryStorageService.deleteFile(toRemove.getPublicId(), toRemove.getMediaType());
        }

        memory.removeMedia(toRemove);

        if (memory.getCoverImageUrl() != null &&
                (memory.getCoverImageUrl().equals(toRemove.getMediaUrl()) || memory.getCoverImageUrl().equals(toRemove.getThumbnailUrl()))) {
            if (!memory.getMediaList().isEmpty()) {
                Media nextCover = memory.getMediaList().get(0);
                memory.setCoverImageUrl(nextCover.getThumbnailUrl() != null ? nextCover.getThumbnailUrl() : nextCover.getMediaUrl());
            } else {
                memory.setCoverImageUrl(null);
            }
        }

        memoryRepository.save(memory);
        log.info("Deleted media id={} from memory id={}", mediaId, memoryId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RelatedMemoryResponseDto> getRelatedMemories(UUID id) {
        Memory target = memoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", "id", id));

        Specification<Memory> spec = MemorySpecification.relatedTo(target);

        // Fetch up to 15 candidates sorted by memoryDate DESC
        Page<Memory> candidatesPage = memoryRepository.findAll(
                spec,
                org.springframework.data.domain.PageRequest.of(0, 15, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "memoryDate"))
        );

        List<Memory> candidates = candidatesPage.getContent();
        if (candidates.isEmpty()) {
            return Collections.emptyList();
        }

        // Score and rank candidates by contextual closeness
        record ScoredCandidate(Memory memory, int score, String reason) {}

        List<ScoredCandidate> scored = new ArrayList<>();
        for (Memory candidate : candidates) {
            int score = 0;
            String reason = null;

            // Same location (+10)
            if (target.getLocationName() != null && !target.getLocationName().isBlank()
                    && candidate.getLocationName() != null
                    && target.getLocationName().trim().equalsIgnoreCase(candidate.getLocationName().trim())) {
                score += 10;
                reason = "Same location: " + candidate.getLocationName();
            }

            // Shared tagged friends (+8)
            if (target.getTaggedUsers() != null && candidate.getTaggedUsers() != null) {
                for (User u : target.getTaggedUsers()) {
                    if (candidate.getTaggedUsers().contains(u)) {
                        score += 8;
                        if (reason == null && u.getFullName() != null) {
                            reason = "With " + u.getFullName().trim();
                        }
                    }
                }
            }

            // Same section or journey (+6)
            if (target.getSection() != null && candidate.getSection() != null
                    && target.getSection().getId().equals(candidate.getSection().getId())) {
                score += 6;
                if (reason == null && candidate.getSection().getTitle() != null) {
                    reason = "Same chapter: " + candidate.getSection().getTitle();
                }
            } else if (target.getJourney() != null && candidate.getJourney() != null
                    && target.getJourney().getId().equals(candidate.getJourney().getId())) {
                score += 4;
                if (reason == null && candidate.getJourney().getTitle() != null) {
                    reason = "From journey: " + candidate.getJourney().getTitle();
                }
            }

            // Temporal closeness (+3)
            if (target.getMemoryDate() != null && candidate.getMemoryDate() != null) {
                long days = Math.abs(java.time.temporal.ChronoUnit.DAYS.between(target.getMemoryDate(), candidate.getMemoryDate()));
                if (days <= 30) {
                    score += 3;
                    if (reason == null) {
                        reason = days == 0 ? "On the same day" : "Around the same time";
                    }
                }
            }

            if (reason == null) {
                reason = "Related moment";
            }

            scored.add(new ScoredCandidate(candidate, score, reason));
        }

        // Sort by score DESC and take top 5 (progressive disclosure rule: strictly lightweight DTOs)
        return scored.stream()
                .sorted((a, b) -> Integer.compare(b.score(), a.score()))
                .limit(5)
                .map(sc -> {
                    Memory m = sc.memory();
                    String coverUrl = m.getCoverImageUrl();
                    if (coverUrl == null || coverUrl.isBlank()) {
                        if (m.getMediaList() != null && !m.getMediaList().isEmpty()) {
                            Media first = m.getMediaList().get(0);
                            coverUrl = first.getThumbnailUrl() != null ? first.getThumbnailUrl() : first.getMediaUrl();
                        }
                    }
                    return RelatedMemoryResponseDto.builder()
                            .id(m.getId())
                            .title(m.getTitle())
                            .memoryDate(m.getMemoryDate())
                            .locationName(m.getLocationName())
                            .coverImageUrl(coverUrl)
                            .relationReason(sc.reason())
                            .mediaCount(m.getMediaList() != null ? m.getMediaList().size() : 0)
                            .build();
                })
                .toList();
    }
}

