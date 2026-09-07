package com.memoryverse.service.impl;

import com.memoryverse.dto.request.AiSearchFetchRequestDto;
import com.memoryverse.dto.request.AiSearchQueryDto;
import com.memoryverse.dto.request.MemorySearchCriteria;
import com.memoryverse.dto.request.MemorySearchFilterDto;
import com.memoryverse.dto.response.AiChatResponseDto;
import com.memoryverse.dto.response.AiSearchRecordsResponseDto;
import com.memoryverse.dto.response.AiSearchSummaryResponseDto;
import com.memoryverse.dto.response.MemoryResponseDto;
import com.memoryverse.dto.response.SearchActionChipDto;
import com.memoryverse.entity.Media;
import com.memoryverse.entity.MediaType;
import com.memoryverse.entity.Memory;
import com.memoryverse.entity.User;
import com.memoryverse.repository.MemoryRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.repository.specification.MemorySpecification;
import com.memoryverse.service.AiSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiSearchServiceImpl implements AiSearchService {

    private final MemoryRepository memoryRepository;
    private final UserRepository userRepository;

    // In-memory cache for search context tokens (TTL: 1 hour)
    private final Map<String, CachedContext> searchContextCache = new ConcurrentHashMap<>();

    private record CachedContext(
            String token,
            MemorySearchFilterDto filter,
            Instant createdAt
    ) {}

    @Override
    @Transactional(readOnly = true)
    public AiSearchSummaryResponseDto searchSummary(UUID userId, AiSearchQueryDto request) {
        cleanExpiredTokens();

        String rawQuery = request.getQuery() != null ? request.getQuery().trim() : "";
        log.info("AI Search 2.0 Tier 1: Processing query='{}', contextToken='{}'", rawQuery, request.getContextToken());

        // 1. Retrieve prior context if provided
        MemorySearchFilterDto priorFilter = resolvePriorFilter(request);

        // 2. Extract structured filter from natural language and merge with prior context
        MemorySearchFilterDto activeFilter = extractAndMergeFilters(rawQuery, priorFilter);

        // 3. Query Database using existing indexes
        Specification<Memory> spec = buildSpecification(activeFilter);
        List<Memory> matchedMemories = memoryRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "memoryDate", "createdAt"));

        // 4. Compute lightweight metadata summary
        int memoryCount = matchedMemories.size();
        int totalImages = 0;
        int totalVideos = 0;
        Set<String> distinctPeople = new LinkedHashSet<>();
        Set<String> distinctLocations = new LinkedHashSet<>();

        for (Memory m : matchedMemories) {
            if (m.getLocationName() != null && !m.getLocationName().isBlank()) {
                distinctLocations.add(m.getLocationName().trim());
            }
            if (m.getCreatedBy() != null && m.getCreatedBy().getFullName() != null) {
                distinctPeople.add(m.getCreatedBy().getFullName().trim());
            }
            if (m.getTaggedUsers() != null) {
                for (User u : m.getTaggedUsers()) {
                    if (u.getFullName() != null) {
                        distinctPeople.add(u.getFullName().trim());
                    }
                }
            }
            if (m.getMediaList() != null) {
                for (Media med : m.getMediaList()) {
                    if (med.getMediaType() == MediaType.VIDEO) {
                        totalVideos++;
                    } else {
                        totalImages++;
                    }
                }
            }
        }

        // 5. Generate conversational summary string
        String summaryText = generateConversationalSummary(activeFilter, memoryCount, totalImages, totalVideos, distinctPeople, distinctLocations);

        // 6. Generate Context Token and Cache
        String searchToken = UUID.randomUUID().toString();
        searchContextCache.put(searchToken, new CachedContext(searchToken, activeFilter, Instant.now()));

        // 7. Generate contextual Action Chips
        List<SearchActionChipDto> actionChips = generateActionChips(memoryCount, totalImages, totalVideos, distinctPeople, activeFilter);

        log.info("AI Search 2.0 Tier 1 completed: token={}, matchingMemories={}, images={}, videos={}",
                searchToken, memoryCount, totalImages, totalVideos);

        return AiSearchSummaryResponseDto.builder()
                .searchToken(searchToken)
                .activeFilters(activeFilter)
                .matchingMemoryCount(memoryCount)
                .totalImageCount(totalImages)
                .totalVideoCount(totalVideos)
                .people(new ArrayList<>(distinctPeople))
                .locations(new ArrayList<>(distinctLocations))
                .conversationalSummary(summaryText)
                .suggestedActions(actionChips)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AiSearchRecordsResponseDto fetchRecords(UUID userId, AiSearchFetchRequestDto request) {
        log.info("AI Search 2.0 Tier 2: Fetching records on-demand for token={}, type={}, page={}, size={}",
                request.getSearchToken(), request.getFetchType(), request.getPage(), request.getSize());

        CachedContext context = searchContextCache.get(request.getSearchToken());
        MemorySearchFilterDto filter;
        if (context != null) {
            filter = context.filter();
        } else {
            filter = MemorySearchFilterDto.builder().build();
        }

        int pageNum = request.getPage() != null && request.getPage() >= 0 ? request.getPage() : 0;
        int pageSize = request.getSize() != null && request.getSize() > 0 ? Math.min(request.getSize(), 50) : 20;

        String fetchType = request.getFetchType() != null ? request.getFetchType().trim().toUpperCase() : "MEDIA";

        if ("MEMORIES".equals(fetchType)) {
            Specification<Memory> spec = buildSpecification(filter);
            PageRequest pageRequest = PageRequest.of(pageNum, pageSize, Sort.by(Sort.Direction.DESC, "memoryDate", "createdAt"));
            Page<Memory> memoryPage = memoryRepository.findAll(spec, pageRequest);

            List<MemoryResponseDto> memoryDtos = memoryPage.getContent().stream()
                    .map(MemoryResponseDto::fromEntity)
                    .collect(Collectors.toList());

            return AiSearchRecordsResponseDto.builder()
                    .searchToken(request.getSearchToken())
                    .fetchType("MEMORIES")
                    .page(pageNum)
                    .size(pageSize)
                    .totalCount(memoryPage.getTotalElements())
                    .hasMore(memoryPage.hasNext())
                    .memories(memoryDtos)
                    .mediaItems(Collections.emptyList())
                    .build();
        } else {
            // Default: MEDIA
            Specification<Memory> spec = buildSpecification(filter);
            List<Memory> matchingMemories = memoryRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "memoryDate", "createdAt"));

            List<AiChatResponseDto.RelatedMediaDto> allMedia = new ArrayList<>();
            for (Memory mem : matchingMemories) {
                if (mem.getMediaList() != null) {
                    for (Media m : mem.getMediaList()) {
                        if ("VIDEO".equalsIgnoreCase(filter.getMediaType()) && m.getMediaType() != MediaType.VIDEO) {
                            continue;
                        }
                        if ("IMAGE".equalsIgnoreCase(filter.getMediaType()) && m.getMediaType() != MediaType.IMAGE) {
                            continue;
                        }
                        allMedia.add(AiChatResponseDto.RelatedMediaDto.builder()
                                .id(m.getId())
                                .mediaType(m.getMediaType() != null ? m.getMediaType().name() : "IMAGE")
                                .mediaUrl(m.getMediaUrl())
                                .thumbnailUrl(m.getThumbnailUrl() != null ? m.getThumbnailUrl() : m.getMediaUrl())
                                .fileName(m.getFileName() != null ? m.getFileName() : "photo.jpg")
                                .durationSeconds(m.getDurationSeconds())
                                .memoryId(mem.getId())
                                .memoryTitle(mem.getTitle())
                                .build());
                    }
                }
            }

            int fromIndex = Math.min(pageNum * pageSize, allMedia.size());
            int toIndex = Math.min(fromIndex + pageSize, allMedia.size());
            List<AiChatResponseDto.RelatedMediaDto> paginatedMedia = allMedia.subList(fromIndex, toIndex);
            boolean hasMore = toIndex < allMedia.size();

            return AiSearchRecordsResponseDto.builder()
                    .searchToken(request.getSearchToken())
                    .fetchType("MEDIA")
                    .page(pageNum)
                    .size(pageSize)
                    .totalCount(allMedia.size())
                    .hasMore(hasMore)
                    .memories(Collections.emptyList())
                    .mediaItems(paginatedMedia)
                    .build();
        }
    }

    private MemorySearchFilterDto resolvePriorFilter(AiSearchQueryDto request) {
        if (request.getPreviousFilters() != null) {
            return request.getPreviousFilters();
        }
        if (request.getContextToken() != null && searchContextCache.containsKey(request.getContextToken())) {
            return searchContextCache.get(request.getContextToken()).filter();
        }
        return null;
    }

    private MemorySearchFilterDto extractAndMergeFilters(String query, MemorySearchFilterDto prior) {
        String lower = query.toLowerCase();
        LocalDate now = LocalDate.now();

        LocalDate dateStart = null;
        LocalDate dateEnd = null;
        String dateDesc = null;

        // Relative Date Recognition
        if (lower.contains("today")) {
            dateStart = now;
            dateEnd = now;
            dateDesc = "today";
        } else if (lower.contains("yesterday")) {
            dateStart = now.minusDays(1);
            dateEnd = now.minusDays(1);
            dateDesc = "yesterday";
        } else if (lower.contains("this week")) {
            dateStart = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            dateEnd = now;
            dateDesc = "this week";
        } else if (lower.contains("last week")) {
            LocalDate lastMon = now.minusWeeks(1).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            dateStart = lastMon;
            dateEnd = lastMon.plusDays(6);
            dateDesc = "last week";
        } else if (lower.contains("this month")) {
            dateStart = now.withDayOfMonth(1);
            dateEnd = now;
            dateDesc = "this month";
        } else if (lower.contains("last month")) {
            YearMonth ym = YearMonth.from(now.minusMonths(1));
            dateStart = ym.atDay(1);
            dateEnd = ym.atEndOfMonth();
            dateDesc = "last month";
        } else if (lower.contains("this year")) {
            dateStart = LocalDate.of(now.getYear(), 1, 1);
            dateEnd = now;
            dateDesc = "this year";
        } else if (lower.contains("last year")) {
            int prevYear = now.getYear() - 1;
            dateStart = LocalDate.of(prevYear, 1, 1);
            dateEnd = LocalDate.of(prevYear, 12, 31);
            dateDesc = "last year";
        } else {
            // Check for explicit 4-digit year (e.g. "2024", "2023", "2022")
            Matcher yearMatcher = Pattern.compile("\\b(20\\d{2})\\b").matcher(query);
            if (yearMatcher.find()) {
                int y = Integer.parseInt(yearMatcher.group(1));
                dateStart = LocalDate.of(y, 1, 1);
                dateEnd = LocalDate.of(y, 12, 31);
                dateDesc = String.valueOf(y);
            }
        }

        // Media Type Recognition
        String mediaType = "ALL";
        if (lower.contains("photo") || lower.contains("photos") || lower.contains("image") || lower.contains("images") || lower.contains("picture")) {
            mediaType = "IMAGE";
        } else if (lower.contains("video") || lower.contains("videos") || lower.contains("clip") || lower.contains("clips")) {
            mediaType = "VIDEO";
        }

        // Favorites Recognition
        Boolean isFavorite = null;
        if (lower.contains("favorite") || lower.contains("favorites") || lower.contains("starred") || lower.contains("best moments")) {
            isFavorite = true;
        }

        // Person Recognition (check known users in database or explicit "'s" possessive)
        String personName = null;
        List<User> allUsers = userRepository.findAll();
        for (User u : allUsers) {
            String fullName = u.getFullName() != null ? u.getFullName().toLowerCase() : "";
            String firstPart = !fullName.isEmpty() ? fullName.split("\\s+")[0] : "";
            if (!firstPart.isEmpty() && (lower.contains(firstPart) || lower.contains(firstPart + "'s"))) {
                personName = u.getFullName();
                break;
            }
            if (!fullName.isEmpty() && lower.contains(fullName)) {
                personName = u.getFullName();
                break;
            }
        }

        if (personName == null) {
            Matcher personMatcher = Pattern.compile("\\b([A-Z][a-z]+)'s?\\b").matcher(query);
            if (personMatcher.find()) {
                String candidate = personMatcher.group(1);
                if (!List.of("Show", "Find", "What", "Today", "Yesterday", "Where", "When").contains(candidate)) {
                    personName = candidate;
                }
            }
        }

        // Location Recognition
        String location = null;
        List<String> knownPlaces = List.of("goa", "hyderabad", "campus", "hostel", "terrace", "auditorium", "beach", "canteen", "baga");
        for (String place : knownPlaces) {
            if (lower.contains(place)) {
                location = Character.toUpperCase(place.charAt(0)) + place.substring(1);
                break;
            }
        }

        // Extract keywords
        List<String> keywords = new ArrayList<>();
        for (String word : query.split("\\s+")) {
            String clean = word.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
            if (clean.length() > 3 && !List.of(
                    "show", "what", "where", "when", "tell", "have", "from", "with", "this", "that",
                    "only", "photos", "photo", "image", "images", "videos", "video", "today", "yesterday"
            ).contains(clean)) {
                keywords.add(clean);
            }
        }

        // CONVERSATIONAL MERGING:
        // If this query is a conversational refinement (e.g. "Only Ravi's" or "Show photos"),
        // merge with prior filters.
        boolean isRefinement = lower.startsWith("only ") || lower.equals("show photos") || lower.equals("show videos")
                || lower.startsWith("in ") || lower.startsWith("from ") || lower.contains("just ");

        if (prior != null && (isRefinement || (keywords.isEmpty() && (personName != null || location != null || !"ALL".equals(mediaType))))) {
            return MemorySearchFilterDto.builder()
                    .dateStart(dateStart != null ? dateStart : prior.getDateStart())
                    .dateEnd(dateEnd != null ? dateEnd : prior.getDateEnd())
                    .relativeDateDescription(dateDesc != null ? dateDesc : prior.getRelativeDateDescription())
                    .location(location != null ? location : prior.getLocation())
                    .personName(personName != null ? personName : prior.getPersonName())
                    .mediaType(!"ALL".equals(mediaType) ? mediaType : prior.getMediaType())
                    .journeyId(prior.getJourneyId())
                    .journeyName(prior.getJourneyName())
                    .isFavorite(isFavorite != null ? isFavorite : prior.getIsFavorite())
                    .keywords(!keywords.isEmpty() ? keywords : prior.getKeywords())
                    .rawQuery(query)
                    .build();
        }

        return MemorySearchFilterDto.builder()
                .dateStart(dateStart)
                .dateEnd(dateEnd)
                .relativeDateDescription(dateDesc)
                .location(location)
                .personName(personName)
                .mediaType(mediaType)
                .isFavorite(isFavorite)
                .keywords(keywords)
                .rawQuery(query)
                .build();
    }

    private Specification<Memory> buildSpecification(MemorySearchFilterDto filter) {
        MemorySearchCriteria criteria = MemorySearchCriteria.builder()
                .mode("MEMORY")
                .mediaType(filter.getMediaType())
                .startDate(filter.getDateStart())
                .endDate(filter.getDateEnd())
                .location(filter.getLocation())
                .journeyName(filter.getJourneyName())
                .taggedFriendNames(filter.getPersonName() != null ? List.of(filter.getPersonName()) : null)
                .featuredOnly(filter.getIsFavorite())
                .keywords(filter.getKeywords())
                .build();

        return MemorySpecification.withCriteria(criteria);
    }

    private String generateConversationalSummary(
            MemorySearchFilterDto filter, int memoryCount, int totalImages, int totalVideos,
            Set<String> people, Set<String> locations) {

        if (memoryCount == 0) {
            StringBuilder sb = new StringBuilder("I couldn't find any memories");
            if (filter.getPersonName() != null) {
                sb.append(" involving ").append(filter.getPersonName());
            }
            if (filter.getLocation() != null) {
                sb.append(" from ").append(filter.getLocation());
            }
            if (filter.getRelativeDateDescription() != null) {
                sb.append(" from ").append(filter.getRelativeDateDescription());
            }
            sb.append(". Try searching for another date range, person, or keyword.");
            return sb.toString();
        }

        StringBuilder sb = new StringBuilder();
        String memoryWord = memoryCount == 1 ? "1 memory" : memoryCount + " memories";
        sb.append("Found ").append(memoryWord);

        if (filter.getLocation() != null) {
            sb.append(" from ").append(filter.getLocation());
        } else if (!locations.isEmpty() && locations.size() <= 2) {
            sb.append(" in ").append(String.join(" & ", locations));
        }

        if (filter.getRelativeDateDescription() != null) {
            sb.append(" (").append(filter.getRelativeDateDescription()).append(")");
        }

        sb.append(" containing ");
        List<String> mediaParts = new ArrayList<>();
        if (totalImages > 0) {
            mediaParts.add(totalImages == 1 ? "1 photo" : totalImages + " photos");
        }
        if (totalVideos > 0) {
            mediaParts.add(totalVideos == 1 ? "1 video" : totalVideos + " videos");
        }
        if (mediaParts.isEmpty()) {
            mediaParts.add("no media files");
        }
        sb.append(String.join(" and ", mediaParts));

        if (filter.getPersonName() != null) {
            sb.append(" with ").append(filter.getPersonName());
        } else if (!people.isEmpty() && people.size() <= 3) {
            sb.append(" involving ").append(String.join(", ", people));
        }

        sb.append(".");
        return sb.toString();
    }

    private List<SearchActionChipDto> generateActionChips(
            int memoryCount, int totalImages, int totalVideos, Set<String> people, MemorySearchFilterDto filter) {

        List<SearchActionChipDto> chips = new ArrayList<>();

        if (totalImages > 0) {
            chips.add(SearchActionChipDto.builder()
                    .action("VIEW_PHOTOS")
                    .label(totalImages == 1 ? "View 1 Photo" : "View " + totalImages + " Photos")
                    .count(totalImages)
                    .build());
        }

        if (totalVideos > 0) {
            chips.add(SearchActionChipDto.builder()
                    .action("VIEW_VIDEOS")
                    .label(totalVideos == 1 ? "View 1 Video" : "View " + totalVideos + " Videos")
                    .count(totalVideos)
                    .build());
        }

        if (memoryCount > 0) {
            chips.add(SearchActionChipDto.builder()
                    .action("VIEW_MEMORIES")
                    .label(memoryCount == 1 ? "View 1 Memory" : "View " + memoryCount + " Memories")
                    .count(memoryCount)
                    .build());
        }

        // If no specific person was filtered yet, offer refinement chips for discovered people
        if (filter.getPersonName() == null && people.size() > 1) {
            for (String person : people) {
                if (chips.size() >= 5) break;
                chips.add(SearchActionChipDto.builder()
                        .action("FILTER_PERSON")
                        .label("Only " + person)
                        .value(person)
                        .build());
            }
        }

        return chips;
    }

    private void cleanExpiredTokens() {
        Instant threshold = Instant.now().minusSeconds(3600); // 1 hour
        searchContextCache.entrySet().removeIf(entry -> entry.getValue().createdAt().isBefore(threshold));
    }
}
