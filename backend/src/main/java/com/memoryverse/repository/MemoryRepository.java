package com.memoryverse.repository;

import com.memoryverse.entity.Memory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MemoryRepository extends JpaRepository<Memory, UUID>, JpaSpecificationExecutor<Memory> {

    @EntityGraph(attributePaths = {"journey", "section", "createdBy", "mediaList", "taggedUsers"})
    Optional<Memory> findWithDetailsById(UUID id);

    Page<Memory> findByJourneyIdOrderByMemoryDateDesc(UUID journeyId, Pageable pageable);

    Page<Memory> findBySectionIdOrderByMemoryDateDesc(UUID sectionId, Pageable pageable);

    @Query("SELECT m FROM Memory m WHERE EXTRACT(MONTH FROM m.memoryDate) = :month AND EXTRACT(DAY FROM m.memoryDate) = :day ORDER BY m.memoryDate DESC")
    List<Memory> findMemoriesOnThisDay(@Param("month") int month, @Param("day") int day);

    @Query("SELECT m FROM Memory m JOIN m.taggedUsers u WHERE u.id = :userId ORDER BY m.memoryDate DESC")
    Page<Memory> findMemoriesTaggedWithUser(@Param("userId") UUID userId, Pageable pageable);

    Page<Memory> findByCreatedByIdOrderByMemoryDateDesc(UUID userId, Pageable pageable);

    long countByJourneyId(UUID journeyId);

    @EntityGraph(attributePaths = {"journey", "section", "createdBy", "mediaList", "taggedUsers"})
    Optional<Memory> findFirstByIsFeaturedTrueOrderByMemoryDateDesc();

    @EntityGraph(attributePaths = {"journey", "section", "createdBy", "mediaList", "taggedUsers"})
    Page<Memory> findAllByOrderByMemoryDateDesc(Pageable pageable);

    @Query("SELECT DISTINCT EXTRACT(YEAR FROM m.memoryDate) FROM Memory m ORDER BY EXTRACT(YEAR FROM m.memoryDate) DESC")
    List<Integer> findDistinctMemoryYears();

    interface PlaceSummaryProjection {
        String getLocationName();
        Long getMemoryCount();
        java.time.LocalDate getLatestMemoryDate();
        Double getLatitude();
        Double getLongitude();
        String getCoverImageUrl();
    }

    @Query(value = "SELECT * FROM (" +
            "    SELECT DISTINCT ON (m.location_name)" +
            "        m.location_name AS locationName," +
            "        agg.memoryCount," +
            "        agg.latestMemoryDate," +
            "        agg.latitude," +
            "        agg.longitude," +
            "        COALESCE(med.thumbnail_url, med.media_url) AS coverImageUrl" +
            "    FROM (" +
            "        SELECT location_name, COUNT(id) AS memoryCount, MAX(memory_date) AS latestMemoryDate, MAX(latitude) AS latitude, MAX(longitude) AS longitude" +
            "        FROM memories" +
            "        WHERE location_name IS NOT NULL AND TRIM(location_name) <> ''" +
            "        GROUP BY location_name" +
            "    ) agg" +
            "    JOIN memories m ON m.location_name = agg.location_name" +
            "    LEFT JOIN media med ON med.memory_id = m.id" +
            "    ORDER BY m.location_name, m.memory_date DESC" +
            ") sub " +
            "ORDER BY sub.memoryCount DESC, sub.latestMemoryDate DESC",
            nativeQuery = true)
    List<PlaceSummaryProjection> findPlacesSummary();
}
