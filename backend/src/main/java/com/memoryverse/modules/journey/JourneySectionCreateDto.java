package com.memoryverse.modules.journey;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JourneySectionCreateDto {

    @NotBlank(message = "Section title is required")
    @Size(min = 2, max = 150, message = "Section title must be between 2 and 150 characters")
    private String title;

    private String description;

    @Builder.Default
    private Integer displayOrder = 0;

    private LocalDate startDate;

    private LocalDate endDate;
}
