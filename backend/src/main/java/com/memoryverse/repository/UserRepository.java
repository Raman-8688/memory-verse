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
            "COUNT(DISTINCT COALESCE(m1.id, mt.memory_id)) AS memoryCount " +
            "FROM users u " +
            "LEFT JOIN memories m1 ON m1.created_by = u.id " +
            "LEFT JOIN memory_tags mt ON mt.user_id = u.id " +
            "GROUP BY u.id, u.full_name, u.email, u.avatar_url, u.role " +
            "ORDER BY memoryCount DESC, u.full_name ASC",
            nativeQuery = true)
    List<PersonSummaryProjection> findPeopleSummary();
}
