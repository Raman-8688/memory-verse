package com.memoryverse.repository;

import com.memoryverse.entity.ChatMessageMention;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageMentionRepository extends JpaRepository<ChatMessageMention, UUID> {

    List<ChatMessageMention> findByMessageId(UUID messageId);

    @Query("SELECT m FROM ChatMessageMention m WHERE m.message.id IN :messageIds")
    List<ChatMessageMention> findByMessageIdIn(@Param("messageIds") List<UUID> messageIds);

    boolean existsByMessageIdAndMentionedUserId(UUID messageId, UUID mentionedUserId);

    @Query("SELECT COUNT(m) FROM ChatMessageMention m " +
           "JOIN m.message msg " +
           "WHERE msg.chatGroup.id = :groupId " +
           "AND m.mentionedUser.id = :userId " +
           "AND msg.isDeleted = false " +
           "AND (:lastReadAt IS NULL OR msg.createdAt > :lastReadAt)")
    long countUnreadMentionsInGroup(
            @Param("groupId") UUID groupId,
            @Param("userId") UUID userId,
            @Param("lastReadAt") java.time.Instant lastReadAt);
}
