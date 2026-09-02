package com.memoryverse.service.impl;

import com.memoryverse.config.RedisConfig;
import com.memoryverse.dto.request.JourneyCreateDto;
import com.memoryverse.dto.request.JourneySectionCreateDto;
import com.memoryverse.dto.request.JourneySectionUpdateDto;
import com.memoryverse.dto.request.JourneyUpdateDto;
import com.memoryverse.dto.response.JourneyResponseDto;
import com.memoryverse.dto.response.JourneySectionResponseDto;
import com.memoryverse.entity.Journey;
import com.memoryverse.entity.JourneySection;
import com.memoryverse.entity.NotificationType;
import com.memoryverse.entity.User;
import com.memoryverse.exception.BusinessValidationException;
import com.memoryverse.exception.ForbiddenException;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.repository.JourneyRepository;
import com.memoryverse.repository.JourneySectionRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.JourneyService;
import com.memoryverse.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class JourneyServiceImpl implements JourneyService {

    private final JourneyRepository journeyRepository;
    private final JourneySectionRepository journeySectionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    private static final Pattern NONLATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_JOURNEYS, key = "'all'")
    public List<JourneyResponseDto> getAllJourneys() {
        return journeyRepository.findAllByOrderByDisplayOrderAscCreatedAtDesc().stream()
                .map(JourneyResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public JourneyResponseDto getJourneyById(UUID id) {
        Journey journey = journeyRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Journey", "id", id));
        return JourneyResponseDto.fromEntity(journey);
    }

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_JOURNEYS, RedisConfig.CACHE_DASHBOARD}, allEntries = true)
    public JourneyResponseDto createJourney(JourneyCreateDto dto, UUID creatorId) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", creatorId));

        String slug = generateUniqueSlug(dto.getTitle());

        Journey journey = Journey.builder()
                .title(dto.getTitle().trim())
                .slug(slug)
                .description(dto.getDescription())
                .coverImageUrl(dto.getCoverImageUrl())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .displayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : 0)
                .createdBy(creator)
                .isActive(true)
                .build();

        if (dto.getSections() != null && !dto.getSections().isEmpty()) {
            for (JourneySectionCreateDto secDto : dto.getSections()) {
                JourneySection section = JourneySection.builder()
                        .title(secDto.getTitle().trim())
                        .description(secDto.getDescription())
                        .displayOrder(secDto.getDisplayOrder() != null ? secDto.getDisplayOrder() : 0)
                        .startDate(secDto.getStartDate())
                        .endDate(secDto.getEndDate())
                        .imageUrl(secDto.getImageUrl())
                        .build();
                journey.addSection(section);
            }
        }

        Journey savedJourney = journeyRepository.save(journey);
        log.info("Journey created: id={}, title='{}', slug='{}'", savedJourney.getId(), savedJourney.getTitle(), savedJourney.getSlug());
        return JourneyResponseDto.fromEntity(savedJourney);
    }

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_JOURNEYS, RedisConfig.CACHE_DASHBOARD}, allEntries = true)
    public JourneySectionResponseDto addSection(UUID journeyId, JourneySectionCreateDto dto) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new ResourceNotFoundException("Journey", "id", journeyId));

        JourneySection section = JourneySection.builder()
                .journey(journey)
                .title(dto.getTitle().trim())
                .description(dto.getDescription())
                .displayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : journey.getSections().size())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .imageUrl(dto.getImageUrl())
                .build();

        JourneySection savedSection = journeySectionRepository.save(section);
        log.info("Section '{}' added to journey '{}'", savedSection.getTitle(), journey.getTitle());

        User creator = journey.getCreatedBy();
        String creatorName = creator != null ? creator.getFullName() : "A friend";
        notificationService.notifyGroup(
                creator,
                String.format("You added a new chapter '%s' to '%s'", savedSection.getTitle(), journey.getTitle()),
                String.format("%s added chapter '%s' to '%s'", creatorName, savedSection.getTitle(), journey.getTitle()),
                NotificationType.CHAPTER_UPDATED,
                journey.getId()
        );

        return JourneySectionResponseDto.fromEntity(savedSection);
    }

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_JOURNEYS, RedisConfig.CACHE_DASHBOARD}, allEntries = true)
    public JourneySectionResponseDto updateSection(UUID journeyId, UUID sectionId, JourneySectionUpdateDto dto, UUID currentUserId) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new ResourceNotFoundException("Journey", "id", journeyId));

        boolean isCreator = journey.getCreatedBy() != null && journey.getCreatedBy().getId().equals(currentUserId);
        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        if (!isCreator && !isAdmin) {
            throw new ForbiddenException("You do not have permission to update this chapter");
        }

        JourneySection section = journeySectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("JourneySection", "id", sectionId));

        if (!section.getJourney().getId().equals(journeyId)) {
            throw new BusinessValidationException("Chapter does not belong to the specified journey");
        }

        section.setTitle(dto.getTitle().trim());
        section.setDescription(dto.getDescription());
        section.setStartDate(dto.getStartDate());
        section.setEndDate(dto.getEndDate());
        if (dto.getImageUrl() != null) {
            section.setImageUrl(dto.getImageUrl().trim());
        }
        if (dto.getDisplayOrder() != null) {
            section.setDisplayOrder(dto.getDisplayOrder());
        }

        JourneySection saved = journeySectionRepository.save(section);
        log.info("Journey section updated: id={}, title='{}', journeyId={}", saved.getId(), saved.getTitle(), journeyId);

        User updater = userRepository.findById(currentUserId).orElse(null);
        String updaterName = updater != null ? updater.getFullName() : "A friend";
        notificationService.notifyGroup(
                updater,
                String.format("You updated chapter: '%s'", saved.getTitle()),
                String.format("%s updated chapter '%s' in '%s'", updaterName, saved.getTitle(), journey.getTitle()),
                NotificationType.CHAPTER_UPDATED,
                journeyId
        );

        return JourneySectionResponseDto.fromEntity(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_JOURNEYS, RedisConfig.CACHE_DASHBOARD}, allEntries = true)
    public JourneyResponseDto updateJourney(UUID journeyId, JourneyUpdateDto dto, UUID currentUserId) {
        Journey journey = journeyRepository.findWithDetailsById(journeyId)
                .orElseThrow(() -> new ResourceNotFoundException("Journey", "id", journeyId));

        boolean isCreator = journey.getCreatedBy() != null && journey.getCreatedBy().getId().equals(currentUserId);
        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        if (!isCreator && !isAdmin) {
            throw new ForbiddenException("You do not have permission to update this journey");
        }

        String newTitle = dto.getTitle().trim();
        if (!journey.getTitle().equalsIgnoreCase(newTitle)) {
            journey.setTitle(newTitle);
            journey.setSlug(generateUniqueSlug(newTitle));
        }

        journey.setDescription(dto.getDescription());
        journey.setStartDate(dto.getStartDate());
        journey.setEndDate(dto.getEndDate());
        if (dto.getCoverImageUrl() != null) {
            journey.setCoverImageUrl(dto.getCoverImageUrl().trim());
        }
        if (dto.getDisplayOrder() != null) {
            journey.setDisplayOrder(dto.getDisplayOrder());
        }

        Journey updated = journeyRepository.save(journey);
        log.info("Journey updated: id={}, title='{}'", updated.getId(), updated.getTitle());

        User updater = userRepository.findById(currentUserId).orElse(null);
        String updaterName = updater != null ? updater.getFullName() : "A friend";
        notificationService.notifyGroup(
                updater,
                String.format("You updated journey narrative: '%s'", updated.getTitle()),
                String.format("%s updated journey '%s'", updaterName, updated.getTitle()),
                NotificationType.JOURNEY_UPDATED,
                updated.getId()
        );

        return JourneyResponseDto.fromEntity(updated);
    }

    private String generateUniqueSlug(String input) {
        if (input == null) input = "journey";
        String nowhitespace = WHITESPACE.matcher(input.trim()).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = NONLATIN.matcher(normalized).replaceAll("").toLowerCase(Locale.ENGLISH);

        String baseSlug = slug.replaceAll("-{2,}", "-").replaceAll("^-|-$", "");
        if (baseSlug.isEmpty()) baseSlug = "journey";

        String candidate = baseSlug;
        int count = 1;
        while (journeyRepository.existsBySlug(candidate)) {
            candidate = baseSlug + "-" + count++;
        }
        return candidate;
    }
}
