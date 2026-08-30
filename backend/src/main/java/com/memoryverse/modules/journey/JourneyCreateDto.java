package com.memoryverse.modules.journey;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JourneyCreateDto {

    @NotBlank(message = "Journey title is required")
    @Size(min = 2, max = 150, message = "Journey title must be between 2 and 150 characters")
    private String title;

    private String description;

    private String coverImageUrl;

    private LocalDate startDate;

    private LocalDate endDate;

    @Builder.Default
    private Integer displayOrder = 0;

    @Builder.Default
    private List<JourneySectionCreateDto> sections = new ArrayList<>();
}
