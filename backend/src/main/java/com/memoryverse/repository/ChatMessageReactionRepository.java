package com.memoryverse.repository;

import com.memoryverse.entity.ChatMessageReaction;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatMessageReactionRepository extends JpaRepository<ChatMessageReaction, UUID> {

    @EntityGraph(attributePaths = {"user"})
    List<ChatMessageReaction> findAllByMessageId(UUID messageId);

    Optional<ChatMessageReaction> findByMessageIdAndUserIdAndReactionCode(UUID messageId, UUID userId, String reactionCode);

    void deleteByMessageIdAndUserIdAndReactionCode(UUID messageId, UUID userId, String reactionCode);
}
