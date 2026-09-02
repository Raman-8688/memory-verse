package com.memoryverse.repository;

import com.memoryverse.entity.AiConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiConversationRepository extends JpaRepository<AiConversation, UUID> {

    List<AiConversation> findByUserIdOrderByUpdatedAtDesc(UUID userId);

    Optional<AiConversation> findByIdAndUserId(UUID id, UUID userId);
}
