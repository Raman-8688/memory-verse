package com.memoryverse.modules.memory;

import com.memoryverse.modules.ai.dto.MemorySearchCriteria;
import com.memoryverse.modules.media.Media;
import com.memoryverse.modules.media.MediaType;
import com.memoryverse.modules.user.User;
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

            // 1. Keywords matching title, story, or location
            if (criteria.getKeywords() != null && !criteria.getKeywords().isEmpty()) {
                for (String kw : criteria.getKeywords()) {
                    if (kw != null && !kw.trim().isEmpty()) {
                        String pattern = "%" + kw.trim().toLowerCase() + "%";
                        Predicate keywordPredicate = cb.or(
                                cb.like(cb.lower(root.get("title")), pattern),
                                cb.like(cb.lower(root.get("story")), pattern),
                                cb.like(cb.lower(root.get("locationName")), pattern)
                        );
                        predicates.add(keywordPredicate);
                    }
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
}
