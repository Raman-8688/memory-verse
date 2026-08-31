package com.memoryverse.modules.ai.conversation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiMessageRepository extends JpaRepository<AiMessage, UUID> {

    /**
     * Retrieves the last 6 messages of a conversation ordered from newest to oldest.
     * Enforces the rolling window limit to prevent prompt token bloat.
     */
    List<AiMessage> findTop6ByConversationIdOrderByCreatedAtDesc(UUID conversationId);

    List<AiMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    void deleteByConversationId(UUID conversationId);
}
