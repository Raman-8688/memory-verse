package com.memoryverse.repository.specification;

import com.memoryverse.dto.request.MemorySearchCriteria;
import com.memoryverse.entity.Media;
import com.memoryverse.entity.MediaType;
import com.memoryverse.entity.Memory;
import com.memoryverse.entity.User;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class MemorySpecification {

    private MemorySpecification() {}

    /**
     * Builds a dynamic, type-safe JPA Specification based strictly on the structured criteria.
     * Guaranteed ZERO raw SQL.
     */
    public static Specification<Memory> withCriteria(MemorySearchCriteria criteria) {
        return (root, query, cb) -> {
            if (criteria == null) {
                return cb.conjunction();
            }

            // Ensure distinct results when joining mediaList or taggedUsers
            query.distinct(true);

            List<Predicate> predicates = new ArrayList<>();

            // 1. Keywords matching title, story, or location (combine with OR across all keywords)
            if (criteria.getKeywords() != null && !criteria.getKeywords().isEmpty()) {
                List<Predicate> keywordPredicates = new ArrayList<>();
                for (String kw : criteria.getKeywords()) {
                    if (kw != null && !kw.trim().isEmpty()) {
                        String pattern = "%" + kw.trim().toLowerCase() + "%";
                        keywordPredicates.add(cb.like(cb.lower(root.get("title")), pattern));
                        keywordPredicates.add(cb.like(cb.lower(root.get("story")), pattern));
                        keywordPredicates.add(cb.like(cb.lower(root.get("locationName")), pattern));
                    }
                }
                if (!keywordPredicates.isEmpty()) {
                    predicates.add(cb.or(keywordPredicates.toArray(new Predicate[0])));
                }
            }

            // 2. Journey filter (by journey title or slug)
            if (criteria.getJourneyName() != null && !criteria.getJourneyName().trim().isEmpty()) {
                String journeyPattern = "%" + criteria.getJourneyName().trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("journey").get("title")), journeyPattern),
                        cb.like(cb.lower(root.get("journey").get("slug")), journeyPattern)
                ));
            }

            // 3. Section/Chapter filter (by section title)
            if (criteria.getSectionName() != null && !criteria.getSectionName().trim().isEmpty()) {
                String sectionPattern = "%" + criteria.getSectionName().trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("section").get("title")), sectionPattern));
            }

            // 4. Date range filters
            if (criteria.getStartDate() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("memoryDate"), criteria.getStartDate()));
            }
            if (criteria.getEndDate() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("memoryDate"), criteria.getEndDate()));
            }

            // 5. Named location filter
            if (criteria.getLocation() != null && !criteria.getLocation().trim().isEmpty()) {
                String locPattern = "%" + criteria.getLocation().trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("locationName")), locPattern));
            }

            // 6. Featured only flag
            if (Boolean.TRUE.equals(criteria.getFeaturedOnly())) {
                predicates.add(cb.isTrue(root.get("isFeatured")));
            }

            // 7. Tagged friend names filter
            if (criteria.getTaggedFriendNames() != null && !criteria.getTaggedFriendNames().isEmpty()) {
                for (String friend : criteria.getTaggedFriendNames()) {
                    if (friend != null && !friend.trim().isEmpty()) {
                        Join<Memory, User> taggedJoin = root.join("taggedUsers", JoinType.INNER);
                        String friendPattern = "%" + friend.trim().toLowerCase() + "%";
                        predicates.add(cb.like(cb.lower(taggedJoin.get("fullName")), friendPattern));
                    }
                }
            }

            // 8. Media type filter (PHOTOS / VIDEOS)
            if (criteria.getMediaType() != null && !criteria.getMediaType().trim().isEmpty()) {
                String type = criteria.getMediaType().trim().toUpperCase();
                if ("PHOTOS".equals(type) || "IMAGE".equals(type)) {
                    Join<Memory, Media> mediaJoin = root.join("mediaList", JoinType.INNER);
                    predicates.add(cb.equal(mediaJoin.get("mediaType"), MediaType.IMAGE));
                } else if ("VIDEOS".equals(type) || "VIDEO".equals(type)) {
                    Join<Memory, Media> mediaJoin = root.join("mediaList", JoinType.INNER);
                    predicates.add(cb.equal(mediaJoin.get("mediaType"), MediaType.VIDEO));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Builds a specification to discover related memories based on location,
     * journey, tagged users, and temporal proximity.
     */
    public static Specification<Memory> relatedTo(Memory target) {
        return (root, query, cb) -> {
            query.distinct(true);

            // Never include the target memory itself
            Predicate notSelf = cb.notEqual(root.get("id"), target.getId());

            List<Predicate> orPredicates = new ArrayList<>();

            // 1. Same location (case-insensitive)
            if (target.getLocationName() != null && !target.getLocationName().isBlank()) {
                orPredicates.add(cb.equal(cb.lower(root.get("locationName")), target.getLocationName().trim().toLowerCase()));
            }

            // 2. Same journey
            if (target.getJourney() != null) {
                orPredicates.add(cb.equal(root.get("journey").get("id"), target.getJourney().getId()));
            }

            // 3. Same section
            if (target.getSection() != null) {
                orPredicates.add(cb.equal(root.get("section").get("id"), target.getSection().getId()));
            }

            // 4. Same tagged friends
            if (target.getTaggedUsers() != null && !target.getTaggedUsers().isEmpty()) {
                List<java.util.UUID> userIds = target.getTaggedUsers().stream().map(User::getId).toList();
                Join<Memory, User> taggedJoin = root.join("taggedUsers", JoinType.INNER);
                orPredicates.add(taggedJoin.get("id").in(userIds));
            }

            // 5. Adjacent dates (+/- 45 days)
            if (target.getMemoryDate() != null) {
                java.time.LocalDate start = target.getMemoryDate().minusDays(45);
                java.time.LocalDate end = target.getMemoryDate().plusDays(45);
                orPredicates.add(cb.between(root.get("memoryDate"), start, end));
            }

            if (orPredicates.isEmpty()) {
                return notSelf;
            }

            return cb.and(notSelf, cb.or(orPredicates.toArray(new Predicate[0])));
        };
    }
}

