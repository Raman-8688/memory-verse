package com.memoryverse.service.impl;

import com.memoryverse.config.RedisConfig;
import com.memoryverse.dto.response.DashboardResponseDto;
import com.memoryverse.dto.response.DashboardStatsDto;
import com.memoryverse.dto.response.JourneyResponseDto;
import com.memoryverse.dto.response.MemoryResponseDto;
import com.memoryverse.dto.response.TimelineMilestoneDto;
import com.memoryverse.entity.Journey;
import com.memoryverse.entity.JourneySection;
import com.memoryverse.entity.MediaType;
import com.memoryverse.entity.Memory;
import com.memoryverse.repository.JourneyRepository;
import com.memoryverse.repository.MediaRepository;
import com.memoryverse.repository.MemoryRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final MemoryRepository memoryRepository;
    private final JourneyRepository journeyRepository;
    private final MediaRepository mediaRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_DASHBOARD, key = "'main'")
    public DashboardResponseDto getDashboardData() {
        log.info("Generating aggregated dashboard data from database...");

        // 1. Calculate Aggregate Statistics
        long totalMemories = memoryRepository.count();
        long totalPhotos = mediaRepository.countByMediaType(MediaType.IMAGE);
        long totalVideos = mediaRepository.countByMediaType(MediaType.VIDEO);
        long totalJourneys = journeyRepository.count();
        long totalFriends = userRepository.count();

        DashboardStatsDto stats = DashboardStatsDto.builder()
                .totalMemories(totalMemories)
                .totalPhotos(totalPhotos)
                .totalVideos(totalVideos)
                .totalJourneys(totalJourneys)
                .totalFriends(totalFriends)
                .build();

        // 2. Algorithm: "Memory of the Day"
        LocalDate today = LocalDate.now();
        List<Memory> onThisDayMemories = memoryRepository.findMemoriesOnThisDay(today.getMonthValue(), today.getDayOfMonth());

        Memory selectedMotd = null;
        String motdContext = "Moments That Defined Us";

        if (!onThisDayMemories.isEmpty()) {
            selectedMotd = onThisDayMemories.get(0);
            int yearsAgo = today.getYear() - selectedMotd.getMemoryDate().getYear();
            motdContext = yearsAgo > 0 
                    ? String.format("On this day %d %s ago (%d)", yearsAgo, (yearsAgo == 1 ? "year" : "years"), selectedMotd.getMemoryDate().getYear())
                    : "Captured Today";
        } else {
            // Fallback to a featured memory
            Optional<Memory> featured = memoryRepository.findFirstByIsFeaturedTrueOrderByMemoryDateDesc();
            if (featured.isPresent()) {
                selectedMotd = featured.get();
                motdContext = "Featured Memory of the Day";
            } else {
                // Fallback to latest memory
                Page<Memory> latest = memoryRepository.findAllByOrderByMemoryDateDesc(PageRequest.of(0, 1));
                if (!latest.isEmpty()) {
                    selectedMotd = latest.getContent().get(0);
                    motdContext = "Recent Memory Highlight";
                }
            }
        }

        MemoryResponseDto motdDto = selectedMotd != null ? MemoryResponseDto.fromEntity(selectedMotd) : null;

        // 3. Dynamic Chronological Journey Timeline
        List<Journey> allJourneys = journeyRepository.findAllByOrderByDisplayOrderAscCreatedAtDesc();
        List<TimelineMilestoneDto> timeline = new ArrayList<>();

        for (Journey journey : allJourneys) {
            String year = journey.getStartDate() != null ? String.valueOf(journey.getStartDate().getYear()) : "Era";
            timeline.add(TimelineMilestoneDto.builder()
                    .year(year)
                    .periodTitle(journey.getTitle())
                    .description(journey.getDescription())
                    .coverImageUrl(journey.getCoverImageUrl())
                    .journeyId(journey.getId())
                    .milestoneDate(journey.getStartDate())
                    .memoryCount(memoryRepository.countByJourneyId(journey.getId()))
                    .build());

            if (journey.getSections() != null) {
                for (JourneySection section : journey.getSections()) {
                    String secYear = section.getStartDate() != null 
                            ? String.valueOf(section.getStartDate().getYear()) 
                            : year;
                    timeline.add(TimelineMilestoneDto.builder()
                            .year(secYear)
                            .periodTitle(section.getTitle())
                            .description(section.getDescription())
                            .coverImageUrl(journey.getCoverImageUrl())
                            .journeyId(journey.getId())
                            .sectionId(section.getId())
                            .milestoneDate(section.getStartDate())
                            .memoryCount(0)
                            .build());
                }
            }
        }

        // Sort timeline chronologically if dates exist
        timeline.sort(Comparator.comparing(
                TimelineMilestoneDto::getMilestoneDate, 
                Comparator.nullsLast(Comparator.naturalOrder())));

        // 4. Recent Memories (Limit to 6)
        Page<Memory> recentPage = memoryRepository.findAllByOrderByMemoryDateDesc(PageRequest.of(0, 6));
        List<MemoryResponseDto> recentMemories = recentPage.getContent().stream()
                .map(MemoryResponseDto::fromEntity)
                .collect(Collectors.toList());

        // 5. Active Journeys
        List<JourneyResponseDto> activeJourneys = journeyRepository
                .findByIsActiveTrueOrderByDisplayOrderAscCreatedAtDesc().stream()
                .map(JourneyResponseDto::fromEntity)
                .collect(Collectors.toList());

        return DashboardResponseDto.builder()
                .stats(stats)
                .memoryOfTheDay(motdDto)
                .memoryOfTheDayContext(motdContext)
                .timeline(timeline)
                .recentMemories(recentMemories)
                .activeJourneys(activeJourneys)
                .build();
    }
}
