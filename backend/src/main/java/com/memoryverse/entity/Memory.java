package com.memoryverse.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "memories", indexes = {
        @Index(name = "idx_memories_memory_date", columnList = "memory_date"),
        @Index(name = "idx_memories_journey_id", columnList = "journey_id"),
        @Index(name = "idx_memories_section_id", columnList = "section_id"),
        @Index(name = "idx_memories_created_by", columnList = "created_by"),
        @Index(name = "idx_memories_created_at", columnList = "created_at"),
        @Index(name = "idx_memories_is_favorite", columnList = "is_favorite"),
        @Index(name = "idx_memories_deleted_at", columnList = "deleted_at")
})
@SQLDelete(sql = "UPDATE memories SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Memory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String story;

    @Column(name = "memory_date", nullable = false)
    private LocalDate memoryDate;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(name = "location_name", length = 200)
    private String locationName;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "is_featured", nullable = false)
    @Builder.Default
    private Boolean isFeatured = false;

    @Column(name = "is_favorite", nullable = false)
    @Builder.Default
    private Boolean isFavorite = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "privacy_level", nullable = false)
    @Builder.Default
    private PrivacyLevel privacyLevel = PrivacyLevel.CIRCLE_COMPANIONS;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journey_id", nullable = false)
    private Journey journey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id")
    private JourneySection section;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @OneToMany(mappedBy = "memory", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("displayOrder ASC, createdAt ASC")
    @JsonManagedReference
    @Builder.Default
    private List<Media> mediaList = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "memory_tagged_users",
            joinColumns = @JoinColumn(name = "memory_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private Set<User> taggedUsers = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public void addMedia(Media media) {
        mediaList.add(media);
        media.setMemory(this);
    }

    public void removeMedia(Media media) {
        mediaList.remove(media);
        media.setMemory(null);
    }

    public void tagUser(User user) {
        taggedUsers.add(user);
    }

    public void untagUser(User user) {
        taggedUsers.remove(user);
    }
}
