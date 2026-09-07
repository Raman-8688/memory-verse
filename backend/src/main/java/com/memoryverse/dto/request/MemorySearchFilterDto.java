package com.memoryverse.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemorySearchFilterDto implements Serializable {

    private LocalDate dateStart;
    private LocalDate dateEnd;
    private String relativeDateDescription;

    private String location;
    private String personName;
    private List<String> taggedFriendNames;

    /**
     * ALL, IMAGE, VIDEO
     */
    @Builder.Default
    private String mediaType = "ALL";

    private UUID journeyId;
    private String journeyName;
    private UUID sectionId;
    private String sectionName;

    private Boolean isFavorite;
    private List<String> keywords;
    private String rawQuery;
}
