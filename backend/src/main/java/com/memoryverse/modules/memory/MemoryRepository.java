package com.memoryverse.modules.memory;

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
}
