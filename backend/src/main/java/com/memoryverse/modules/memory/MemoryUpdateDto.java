package com.memoryverse.modules.memory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class MemoryUpdateDto {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @NotBlank(message = "Story is required")
    private String story;

    @NotNull(message = "Memory date is required")
    private LocalDate memoryDate;

    @Size(max = 150, message = "Location must not exceed 150 characters")
    private String locationName;
}
