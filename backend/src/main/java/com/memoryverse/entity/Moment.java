package com.memoryverse.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "moments", indexes = {
        @Index(name = "idx_moments_author_id", columnList = "author_id"),
        @Index(name = "idx_moments_created_at", columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Moment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(columnDefinition = "TEXT")
    private String caption;

    @OneToMany(mappedBy = "moment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("displayOrder ASC, createdAt ASC")
    @BatchSize(size = 30)
    @JsonManagedReference
    @Builder.Default
    private List<MomentMedia> mediaList = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public void addMedia(MomentMedia media) {
        if (media != null && !mediaList.contains(media)) {
            mediaList.add(media);
            media.setMoment(this);
        }
    }

    public void removeMedia(MomentMedia media) {
        if (media != null) {
            mediaList.remove(media);
            media.setMoment(null);
        }
    }
}
