package com.memoryverse.repository;

import com.memoryverse.entity.SharedLink;
import com.memoryverse.entity.SharedResourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SharedLinkRepository extends JpaRepository<SharedLink, UUID> {

    Optional<SharedLink> findByTokenAndIsActiveTrue(String token);

    Optional<SharedLink> findFirstByResourceTypeAndResourceIdAndIsActiveTrue(SharedResourceType resourceType, UUID resourceId);

    @Modifying
    @Query("UPDATE SharedLink s SET s.viewCount = s.viewCount + 1 WHERE s.id = :id")
    void incrementViewCount(@Param("id") UUID id);
}
