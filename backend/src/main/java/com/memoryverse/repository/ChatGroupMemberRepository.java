package com.memoryverse.repository;

import com.memoryverse.entity.ChatGroupMember;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatGroupMemberRepository extends JpaRepository<ChatGroupMember, UUID> {

    @EntityGraph(attributePaths = {"user"})
    Optional<ChatGroupMember> findByChatGroupIdAndUserId(UUID chatGroupId, UUID userId);

    boolean existsByChatGroupIdAndUserId(UUID chatGroupId, UUID userId);

    @EntityGraph(attributePaths = {"user"})
    List<ChatGroupMember> findAllByChatGroupId(UUID chatGroupId);

    @EntityGraph(attributePaths = {"chatGroup"})
    List<ChatGroupMember> findAllByUserId(UUID userId);

    long countByChatGroupId(UUID chatGroupId);

    @org.springframework.data.jpa.repository.Query("SELECT m.chatGroup.id, COUNT(m.id) FROM ChatGroupMember m WHERE m.chatGroup.id IN :groupIds GROUP BY m.chatGroup.id")
    List<Object[]> countMembersByGroupIds(@org.springframework.data.repository.query.Param("groupIds") List<UUID> groupIds);

    @EntityGraph(attributePaths = {"user"})
    List<ChatGroupMember> findByChatGroupIdInAndUserId(List<UUID> chatGroupIds, UUID userId);

    void deleteByChatGroupIdAndUserId(UUID chatGroupId, UUID userId);
}
