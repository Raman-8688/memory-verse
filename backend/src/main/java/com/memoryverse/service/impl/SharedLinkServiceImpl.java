package com.memoryverse.service.impl;

import com.memoryverse.dto.request.CreateSharedLinkRequestDto;
import com.memoryverse.dto.response.*;
import com.memoryverse.entity.SharedLink;
import com.memoryverse.entity.SharedResourceType;
import com.memoryverse.entity.User;
import com.memoryverse.exception.BusinessValidationException;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.repository.SharedLinkRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.service.JourneyService;
import com.memoryverse.service.MemoryService;
import com.memoryverse.service.SharedLinkService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SharedLinkServiceImpl implements SharedLinkService {

    private final SharedLinkRepository sharedLinkRepository;
    private final UserRepository userRepository;
    private final MemoryService memoryService;
    private final JourneyService journeyService;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    @Transactional
    public SharedLinkResponseDto createOrGetSharedLink(CreateSharedLinkRequestDto request, UUID currentUserId) {
        log.info("Creating or fetching share link for {} id={}", request.getResourceType(), request.getResourceId());

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Optional<SharedLink> existing = sharedLinkRepository.findFirstByResourceTypeAndResourceIdAndIsActiveTrue(
                request.getResourceType(), request.getResourceId());

        if (existing.isPresent()) {
            SharedLink link = existing.get();
            if (link.getExpiresAt() != null && link.getExpiresAt().isBefore(Instant.now())) {
                link.setIsActive(false);
                sharedLinkRepository.save(link);
            } else {
                return SharedLinkResponseDto.fromEntity(link);
            }
        }

        byte[] randomBytes = new byte[16];
        SECURE_RANDOM.nextBytes(randomBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        Instant expiresAt = null;
        if (request.getExpiresInDays() != null && request.getExpiresInDays() > 0) {
            expiresAt = Instant.now().plus(request.getExpiresInDays(), ChronoUnit.DAYS);
        }

        SharedLink newLink = SharedLink.builder()
                .token(token)
                .resourceType(request.getResourceType())
                .resourceId(request.getResourceId())
                .createdBy(currentUser)
                .viewCount(0L)
                .isActive(true)
                .expiresAt(expiresAt)
                .build();

        SharedLink saved = sharedLinkRepository.save(newLink);
        return SharedLinkResponseDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public PublicSharedPayloadDto getPublicPayload(String token) {
        SharedLink link = sharedLinkRepository.findByTokenAndIsActiveTrue(token)
                .orElseThrow(() -> new ResourceNotFoundException("Shared link not found or has been revoked."));

        if (link.getExpiresAt() != null && link.getExpiresAt().isBefore(Instant.now())) {
            link.setIsActive(false);
            sharedLinkRepository.save(link);
            throw new BusinessValidationException("This shared link has expired.");
        }

        sharedLinkRepository.incrementViewCount(link.getId());

        PublicSharedPayloadDto.PublicSharedPayloadDtoBuilder builder = PublicSharedPayloadDto.builder()
                .resourceType(link.getResourceType())
                .token(link.getToken())
                .viewCount(link.getViewCount() + 1)
                .sharedAt(link.getCreatedAt())
                .sharedBy(UserDto.fromEntity(link.getCreatedBy()));

        if (link.getResourceType() == SharedResourceType.MEMORY) {
            try {
                MemoryResponseDto memory = memoryService.getMemoryById(link.getResourceId());
                builder.memory(memory);
            } catch (Exception e) {
                log.error("Error fetching shared memory {}: {}", link.getResourceId(), e.getMessage());
                throw new ResourceNotFoundException("The shared memory is no longer available.");
            }
        } else if (link.getResourceType() == SharedResourceType.JOURNEY) {
            try {
                JourneyResponseDto journey = journeyService.getJourneyById(link.getResourceId());
                builder.journey(journey);
            } catch (Exception e) {
                log.error("Error fetching shared journey {}: {}", link.getResourceId(), e.getMessage());
                throw new ResourceNotFoundException("The shared journey is no longer available.");
            }
        }

        return builder.build();
    }

    @Override
    @Transactional
    public void revokeSharedLink(UUID linkId, UUID currentUserId) {
        SharedLink link = sharedLinkRepository.findById(linkId)
                .orElseThrow(() -> new ResourceNotFoundException("Shared link not found"));
        link.setIsActive(false);
        sharedLinkRepository.save(link);
    }
}
