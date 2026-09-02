package com.memoryverse.repository;

import com.memoryverse.entity.MemoryReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MemoryReactionRepository extends JpaRepository<MemoryReaction, UUID> {

    Optional<MemoryReaction> findByMemoryIdAndUserIdAndEmoji(UUID memoryId, UUID userId, String emoji);

    @Query("SELECT r FROM MemoryReaction r JOIN FETCH r.user WHERE r.memory.id = :memoryId")
    List<MemoryReaction> findByMemoryIdWithUser(@Param("memoryId") UUID memoryId);

    long countByMemoryId(UUID memoryId);
}
