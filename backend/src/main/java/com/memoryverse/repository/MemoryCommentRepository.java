package com.memoryverse.repository;

import com.memoryverse.entity.MemoryComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MemoryCommentRepository extends JpaRepository<MemoryComment, UUID> {

    @Query("SELECT c FROM MemoryComment c JOIN FETCH c.user WHERE c.memory.id = :memoryId ORDER BY c.createdAt ASC")
    Page<MemoryComment> findByMemoryIdWithUser(@Param("memoryId") UUID memoryId, Pageable pageable);

    long countByMemoryId(UUID memoryId);
}
