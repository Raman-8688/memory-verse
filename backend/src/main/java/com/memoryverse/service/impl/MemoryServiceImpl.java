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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

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

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_DASHBOARD, RedisConfig.CACHE_GALLERY}, allEntries = true)
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
                .locationName(dto.getLocationName())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .isFeatured(dto.getIsFeatured() != null ? dto.getIsFeatured() : false)
                .journey(journey)
                .section(section)
                .createdBy(creator)
                .build();

        // Tag Friends
        if (dto.getTaggedUserIds() != null && !dto.getTaggedUserIds().isEmpty()) {
            List<User> taggedUsers = userRepository.findAllById(dto.getTaggedUserIds());
            taggedUsers.forEach(memory::tagUser);
        }

        // Upload Media Files
        int displayOrder = 1;
        if (files != null && !files.isEmpty()) {
            for (MultipartFile file : files) {
                if (!file.isEmpty()) {
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
            spec = spec.and((root, query, cb) -> cb.equal(cb.function("MONTH", Integer.class, root.get("memoryDate")), month));
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
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("title")), term),
                    cb.like(cb.lower(root.get("story")), term),
                    cb.like(cb.lower(root.get("locationName")), term)
            ));
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
    @CacheEvict(value = {RedisConfig.CACHE_DASHBOARD, RedisConfig.CACHE_GALLERY}, allEntries = true)
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
        memory.setLocationName(dto.getLocationName() != null ? dto.getLocationName().trim() : null);

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

        return MemoryResponseDto.fromEntity(updated);
    }

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_DASHBOARD, RedisConfig.CACHE_GALLERY}, allEntries = true)
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

        int addedCount = 0;
        for (MultipartFile file : files) {
            if (!file.isEmpty()) {
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
}
