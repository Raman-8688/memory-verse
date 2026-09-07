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
public class AiSearchFetchRequestDto {

    @NotBlank(message = "Search token is required to retrieve on-demand records")
    private String searchToken;

    /**
     * "MEMORIES" or "MEDIA"
     */
    @Builder.Default
    private String fetchType = "MEDIA";

    @Builder.Default
    private Integer page = 0;

    @Builder.Default
    private Integer size = 20;
}
