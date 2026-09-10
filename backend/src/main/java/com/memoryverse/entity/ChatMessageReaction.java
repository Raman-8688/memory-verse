package com.memoryverse.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_message_reactions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_chat_reactions_message_user_code", columnNames = {"message_id", "user_id", "reaction_code"})
        },
        indexes = {
                @Index(name = "idx_chat_reactions_message_id", columnList = "message_id"),
                @Index(name = "idx_chat_reactions_user_id", columnList = "user_id")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ChatMessageReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private ChatMessage message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "reaction_code", nullable = false, length = 32)
    private String reactionCode;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
