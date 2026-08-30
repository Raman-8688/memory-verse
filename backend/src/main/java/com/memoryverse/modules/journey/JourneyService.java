package com.memoryverse.modules.journey;

import com.memoryverse.common.exception.BusinessValidationException;
import com.memoryverse.common.exception.ResourceNotFoundException;
import com.memoryverse.config.RedisConfig;
import com.memoryverse.modules.user.User;
import com.memoryverse.modules.user.UserRepository;
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
public class JourneyService {

    private final JourneyRepository journeyRepository;
    private final JourneySectionRepository journeySectionRepository;
    private final UserRepository userRepository;

    private static final Pattern NONLATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_JOURNEYS, key = "'all'")
    public List<JourneyResponseDto> getAllJourneys() {
        return journeyRepository.findAllByOrderByDisplayOrderAscCreatedAtDesc().stream()
                .map(JourneyResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public JourneyResponseDto getJourneyById(UUID id) {
        Journey journey = journeyRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Journey", "id", id));
        return JourneyResponseDto.fromEntity(journey);
    }

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
                        .build();
                journey.addSection(section);
            }
        }

        Journey savedJourney = journeyRepository.save(journey);
        log.info("Journey created: id={}, title='{}', slug='{}'", savedJourney.getId(), savedJourney.getTitle(), savedJourney.getSlug());
        return JourneyResponseDto.fromEntity(savedJourney);
    }

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
                .build();

        JourneySection savedSection = journeySectionRepository.save(section);
        log.info("Section '{}' added to journey '{}'", savedSection.getTitle(), journey.getTitle());
        return JourneySectionResponseDto.fromEntity(savedSection);
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
