package com.memoryverse.repository;

import com.memoryverse.entity.Moment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MomentRepository extends JpaRepository<Moment, UUID> {

    @EntityGraph(attributePaths = {"author", "mediaList"})
    Page<Moment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"author", "mediaList"})
    Page<Moment> findAllByAuthorIdOrderByCreatedAtDesc(UUID authorId, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "mediaList"})
    Optional<Moment> findWithDetailsById(UUID id);
}
