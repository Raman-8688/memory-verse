package com.memoryverse.repository;

import com.memoryverse.entity.ChatGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatGroupRepository extends JpaRepository<ChatGroup, UUID> {

    @Query("SELECT g FROM ChatGroup g JOIN g.members m WHERE m.user.id = :userId AND g.archived = false ORDER BY g.updatedAt DESC")
    Page<ChatGroup> findUserGroups(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT g FROM ChatGroup g JOIN g.members m WHERE m.user.id = :userId AND LOWER(g.name) LIKE LOWER(CONCAT('%', :query, '%')) AND g.archived = false ORDER BY g.updatedAt DESC")
    Page<ChatGroup> searchUserGroups(@Param("userId") UUID userId, @Param("query") String query, Pageable pageable);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query("SELECT g FROM ChatGroup g WHERE g.id = :id")
    Optional<ChatGroup> findWithCreatorById(@Param("id") UUID id);
}
