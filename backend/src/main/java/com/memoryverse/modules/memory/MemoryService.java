package com.memoryverse.modules.memory;

import com.memoryverse.common.api.PagedResponse;
import com.memoryverse.common.exception.ForbiddenException;
import com.memoryverse.common.exception.ResourceNotFoundException;
import com.memoryverse.common.util.SecurityUtils;
import com.memoryverse.config.RedisConfig;
import com.memoryverse.modules.journey.Journey;
import com.memoryverse.modules.journey.JourneyRepository;
import com.memoryverse.modules.journey.JourneySection;
import com.memoryverse.modules.journey.JourneySectionRepository;
import com.memoryverse.modules.media.CloudinaryStorageService;
import com.memoryverse.modules.media.Media;
import com.memoryverse.modules.media.MediaType;
import com.memoryverse.modules.media.UploadedMediaResult;
import com.memoryverse.modules.user.User;
import com.memoryverse.modules.notification.NotificationService;
import com.memoryverse.modules.notification.NotificationType;
import com.memoryverse.modules.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemoryService {

    private final MemoryRepository memoryRepository;
    private final JourneyRepository journeyRepository;
    private final JourneySectionRepository journeySectionRepository;
    private final UserRepository userRepository;
    private final CloudinaryStorageService cloudinaryStorageService;
    private final NotificationService notificationService;

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

        // Synchronous MVP: Notify all tagged users
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

    @Transactional(readOnly = true)
    public PagedResponse<MemoryResponseDto> getMemories(UUID journeyId, UUID sectionId, String search, Pageable pageable) {
        Specification<Memory> spec = Specification.where(null);

        if (journeyId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("journey").get("id"), journeyId));
        }

        if (sectionId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("section").get("id"), sectionId));
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

    @Transactional(readOnly = true)
    public MemoryResponseDto getMemoryById(UUID id) {
        Memory memory = memoryRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", "id", id));
        return MemoryResponseDto.fromEntity(memory);
    }

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
        return MemoryResponseDto.fromEntity(updated);
    }

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
        return MemoryResponseDto.fromEntity(updated);
    }
}
