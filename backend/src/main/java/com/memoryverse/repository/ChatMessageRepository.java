package com.memoryverse.repository;

import com.memoryverse.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    @EntityGraph(attributePaths = {"sender", "replyToMessage", "replyToMessage.sender"})
    Page<ChatMessage> findByChatGroupIdOrderByCreatedAtDesc(UUID chatGroupId, Pageable pageable);

    @Query("SELECT m FROM ChatMessage m WHERE m.chatGroup.id = :groupId ORDER BY m.createdAt DESC LIMIT 1")
    Optional<ChatMessage> findLatestMessageInGroup(@Param("groupId") UUID groupId);

    @EntityGraph(attributePaths = {"sender", "replyToMessage", "replyToMessage.sender"})
    @Query("SELECT m FROM ChatMessage m WHERE m.id IN (SELECT m2.id FROM ChatMessage m2 WHERE m2.chatGroup.id IN :groupIds AND m2.createdAt = (SELECT MAX(m3.createdAt) FROM ChatMessage m3 WHERE m3.chatGroup.id = m2.chatGroup.id))")
    java.util.List<ChatMessage> findLatestMessagesInGroups(@Param("groupIds") java.util.List<UUID> groupIds);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.chatGroup.id = :groupId AND m.createdAt > :since AND m.sender.id <> :userId AND m.deleted = false")
    long countUnreadMessages(@Param("groupId") UUID groupId, @Param("since") Instant since, @Param("userId") UUID userId);

    @EntityGraph(attributePaths = {"sender", "replyToMessage", "replyToMessage.sender"})
    @Query("SELECT m FROM ChatMessage m WHERE m.chatGroup.id = :groupId AND m.deleted = false AND (LOWER(m.textContent) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(m.originalFileName) LIKE LOWER(CONCAT('%', :query, '%'))) ORDER BY m.createdAt DESC")
    Page<ChatMessage> searchGroupMessages(@Param("groupId") UUID groupId, @Param("query") String query, Pageable pageable);

    @EntityGraph(attributePaths = {"sender"})
    @Query("SELECT m FROM ChatMessage m WHERE m.chatGroup.id = :groupId AND m.messageType IN ('IMAGE', 'VIDEO') AND m.deleted = false AND m.mediaUrl IS NOT NULL ORDER BY m.createdAt DESC")
    Page<ChatMessage> findGroupMediaMessages(@Param("groupId") UUID groupId, Pageable pageable);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.chatGroup.id = :groupId AND m.messageType IN ('IMAGE', 'VIDEO') AND m.deleted = false AND m.mediaUrl IS NOT NULL")
    long countGroupMedia(@Param("groupId") UUID groupId);

    @EntityGraph(attributePaths = {"sender"})
    @Query("SELECT m FROM ChatMessage m WHERE m.chatGroup.id = :groupId AND m.messageType = 'FILE' AND m.deleted = false AND m.mediaUrl IS NOT NULL ORDER BY m.createdAt DESC")
    Page<ChatMessage> findGroupFileMessages(@Param("groupId") UUID groupId, Pageable pageable);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.chatGroup.id = :groupId AND m.messageType = 'FILE' AND m.deleted = false AND m.mediaUrl IS NOT NULL")
    long countGroupFiles(@Param("groupId") UUID groupId);

    Optional<ChatMessage> findByChatGroupIdAndClientMessageId(UUID chatGroupId, String clientMessageId);

    Optional<ChatMessage> findByChatGroupIdAndSenderIdAndClientMessageId(UUID chatGroupId, UUID senderId, String clientMessageId);
}
