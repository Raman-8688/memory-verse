package com.memoryverse.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiSearchQueryDto {

    @NotBlank(message = "Search query cannot be blank")
    private String query;

    /**
     * Optional active session/context token for conversational follow-ups.
     */
    private String contextToken;

    /**
     * Optional direct previous filter state passed from client.
     */
    private MemorySearchFilterDto previousFilters;
}
