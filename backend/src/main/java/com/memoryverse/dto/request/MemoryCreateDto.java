package com.memoryverse.dto.request;

import com.memoryverse.entity.PrivacyLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemoryCreateDto {

    @NotBlank(message = "Title is required")
    @Size(min = 2, max = 200, message = "Title must be between 2 and 200 characters")
    private String title;

    @NotBlank(message = "Story description is required")
    private String story;

    @NotNull(message = "Memory date is required")
    private LocalDate memoryDate;

    private String locationName;

    private Double latitude;

    private Double longitude;

    @NotNull(message = "Journey ID is required")
    private UUID journeyId;

    private UUID sectionId;

    @Builder.Default
    private PrivacyLevel privacyLevel = PrivacyLevel.CIRCLE_COMPANIONS;

    @Builder.Default
    private List<UUID> taggedUserIds = new ArrayList<>();

    @Builder.Default
    private Boolean isFeatured = false;

    @Builder.Default
    private List<String> externalImageUrls = new ArrayList<>();
}
