package com.memoryverse.repository;

import com.memoryverse.entity.Journey;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JourneyRepository extends JpaRepository<Journey, UUID> {

    List<Journey> findAllByOrderByDisplayOrderAscCreatedAtDesc();

    List<Journey> findByIsActiveTrueOrderByDisplayOrderAscCreatedAtDesc();

    Optional<Journey> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @EntityGraph(attributePaths = {"sections", "createdBy"})
    Optional<Journey> findWithDetailsById(UUID id);
}
