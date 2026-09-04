package com.memoryverse.repository;

import com.memoryverse.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    interface PersonSummaryProjection {
        UUID getId();
        String getFullName();
        String getEmail();
        String getAvatarUrl();
        String getRole();
        Long getMemoryCount();
    }

    @Query(value = "SELECT u.id AS id, u.full_name AS fullName, u.email AS email, u.avatar_url AS avatarUrl, u.role AS role, " +
            "(SELECT COUNT(DISTINCT m.id) FROM memories m " +
            " LEFT JOIN memory_tagged_users mtu ON mtu.memory_id = m.id " +
            " WHERE m.deleted_at IS NULL AND (m.created_by = u.id OR mtu.user_id = u.id)) AS memoryCount " +
            "FROM users u " +
            "ORDER BY memoryCount DESC, u.full_name ASC",
            nativeQuery = true)
    List<PersonSummaryProjection> findPeopleSummary();
}
