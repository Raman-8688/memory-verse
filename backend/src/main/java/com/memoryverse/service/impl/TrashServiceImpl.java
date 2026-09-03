package com.memoryverse.service.impl;

import com.memoryverse.dto.response.TrashItemDto;
import com.memoryverse.service.TrashService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrashServiceImpl implements TrashService {

    @PersistenceContext
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<TrashItemDto> getTrashItems(UUID userId) {
        List<TrashItemDto> items = new ArrayList<>();

        // 1. Fetch soft deleted memories for this user
        String memSql = "SELECT m.id, m.title, m.story, m.memory_date, m.location_name, m.deleted_at, " +
                "(SELECT COALESCE(med.thumbnail_url, med.media_url) FROM media med WHERE med.memory_id = m.id ORDER BY med.display_order ASC LIMIT 1) AS thumb " +
                "FROM memories m WHERE m.deleted_at IS NOT NULL AND m.created_by = :userId ORDER BY m.deleted_at DESC";

        Query memQuery = entityManager.createNativeQuery(memSql);
        memQuery.setParameter("userId", userId);
        List<Object[]> memRows = memQuery.getResultList();

        for (Object[] row : memRows) {
            UUID id = (UUID) row[0];
            String title = (String) row[1];
            String story = (String) row[2];
            Date memDate = (Date) row[3];
            String locName = (String) row[4];
            Timestamp delAt = (Timestamp) row[5];
            String thumb = (String) row[6];

            items.add(TrashItemDto.builder()
                    .id(id)
                    .type("MEMORY")
                    .title(title)
                    .description(story)
                    .originalDate(memDate != null ? memDate.toLocalDate() : null)
                    .locationName(locName)
                    .deletedAt(delAt != null ? delAt.toInstant() : null)
                    .thumbnailUrl(thumb)
                    .build());
        }

        // 2. Fetch soft deleted journeys for this user
        String jrnSql = "SELECT j.id, j.title, j.description, j.start_date, j.cover_image_url, j.deleted_at " +
                "FROM journeys j WHERE j.deleted_at IS NOT NULL AND j.created_by = :userId ORDER BY j.deleted_at DESC";

        Query jrnQuery = entityManager.createNativeQuery(jrnSql);
        jrnQuery.setParameter("userId", userId);
        List<Object[]> jrnRows = jrnQuery.getResultList();

        for (Object[] row : jrnRows) {
            UUID id = (UUID) row[0];
            String title = (String) row[1];
            String desc = (String) row[2];
            Date startDate = (Date) row[3];
            String coverUrl = (String) row[4];
            Timestamp delAt = (Timestamp) row[5];

            items.add(TrashItemDto.builder()
                    .id(id)
                    .type("JOURNEY")
                    .title(title)
                    .description(desc)
                    .originalDate(startDate != null ? startDate.toLocalDate() : null)
                    .deletedAt(delAt != null ? delAt.toInstant() : null)
                    .thumbnailUrl(coverUrl)
                    .build());
        }

        return items;
    }

    @Override
    @Transactional
    public void restoreMemory(UUID memoryId, UUID userId) {
        log.info("Restoring memory id={} for user={}", memoryId, userId);
        Query query = entityManager.createNativeQuery(
                "UPDATE memories SET deleted_at = NULL WHERE id = :id AND created_by = :userId");
        query.setParameter("id", memoryId);
        query.setParameter("userId", userId);
        query.executeUpdate();
    }

    @Override
    @Transactional
    public void restoreJourney(UUID journeyId, UUID userId) {
        log.info("Restoring journey id={} for user={}", journeyId, userId);
        Query query = entityManager.createNativeQuery(
                "UPDATE journeys SET deleted_at = NULL WHERE id = :id AND created_by = :userId");
        query.setParameter("id", journeyId);
        query.setParameter("userId", userId);
        query.executeUpdate();
    }

    @Override
    @Transactional
    public void hardDeleteMemory(UUID memoryId, UUID userId) {
        log.info("Hard deleting memory id={} for user={}", memoryId, userId);
        // Delete child comments, reactions, media first if needed
        entityManager.createNativeQuery("DELETE FROM memory_comments WHERE memory_id = :id")
                .setParameter("id", memoryId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM memory_reactions WHERE memory_id = :id")
                .setParameter("id", memoryId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM memory_tagged_users WHERE memory_id = :id")
                .setParameter("id", memoryId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM media WHERE memory_id = :id")
                .setParameter("id", memoryId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM memories WHERE id = :id AND created_by = :userId")
                .setParameter("id", memoryId).setParameter("userId", userId).executeUpdate();
    }

    @Override
    @Transactional
    public void hardDeleteJourney(UUID journeyId, UUID userId) {
        log.info("Hard deleting journey id={} for user={}", journeyId, userId);
        entityManager.createNativeQuery("DELETE FROM journey_sections WHERE journey_id = :id")
                .setParameter("id", journeyId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM journeys WHERE id = :id AND created_by = :userId")
                .setParameter("id", journeyId).setParameter("userId", userId).executeUpdate();
    }

    @Override
    @Transactional
    public void emptyTrash(UUID userId) {
        log.info("Emptying trash for user={}", userId);
        List<TrashItemDto> items = getTrashItems(userId);
        for (TrashItemDto item : items) {
            if ("MEMORY".equals(item.getType())) {
                hardDeleteMemory(item.getId(), userId);
            } else if ("JOURNEY".equals(item.getType())) {
                hardDeleteJourney(item.getId(), userId);
            }
        }
    }
}
