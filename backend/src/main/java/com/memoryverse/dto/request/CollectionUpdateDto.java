package com.memoryverse.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectionUpdateDto {

    @NotBlank(message = "Collection title is required")
    @Size(max = 150, message = "Collection title must not exceed 150 characters")
    private String title;

    private String description;

    private String coverImageUrl;
}
