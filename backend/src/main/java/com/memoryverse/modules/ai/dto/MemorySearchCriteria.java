package com.memoryverse.modules.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemorySearchCriteria {

    /**
     * Query mode: "MEMORY" if referring to group events/photos/dates, "GENERAL" if general world/tech question.
     */
    private String mode;

    /**
     * Filter by asset type: "ALL", "PHOTOS", "VIDEOS"
     */
    private String mediaType;

    /**
     * Extracted subject keywords (e.g. "farewell", "hostel", "hackathon", "exam")
     */
    private List<String> keywords;

    /**
     * Journey name if identified (e.g. "B.Tech College Days", "Goa Trip")
     */
    private String journeyName;

    /**
     * Section/Chapter name if identified (e.g. "First Year", "Final Year")
     */
    private String sectionName;

    /**
     * Explicit start and end date filters if mentioned
     */
    private LocalDate startDate;
    private LocalDate endDate;

    /**
     * Named location or venue (e.g. "Hyderabad", "Hostel Terrace", "Auditorium")
     */
    private String location;

    /**
     * Tagged friends/members mentioned in the query (e.g. "Raman", "Ramesh", "Govardhan")
     */
    private List<String> taggedFriendNames;

    /**
     * Whether user specifically asks for highlighted/featured moments
     */
    private Boolean featuredOnly;
}
