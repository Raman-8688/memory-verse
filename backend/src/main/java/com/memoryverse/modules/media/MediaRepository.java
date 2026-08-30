package com.memoryverse.modules.media;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MediaRepository extends JpaRepository<Media, UUID> {

    List<Media> findByMemoryIdOrderByDisplayOrderAsc(UUID memoryId);

    Page<Media> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
