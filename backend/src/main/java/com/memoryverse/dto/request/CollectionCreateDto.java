package com.memoryverse.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectionCreateDto {

    @NotBlank(message = "Collection title is required")
    @Size(max = 150, message = "Collection title must not exceed 150 characters")
    private String title;

    private String description;

    private String coverImageUrl;

    private List<UUID> initialMemoryIds;
}
