package com.memoryverse.repository;

import com.memoryverse.entity.MemoryCollection;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CollectionRepository extends JpaRepository<MemoryCollection, UUID> {

    @EntityGraph(attributePaths = {"createdBy", "memories", "memories.mediaList"})
    List<MemoryCollection> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"createdBy", "memories", "memories.mediaList"})
    Optional<MemoryCollection> findWithDetailsById(UUID id);
}
