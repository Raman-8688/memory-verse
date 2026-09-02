package com.memoryverse.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiModelInfoDto {
    private String id;
    private String name;
    private String description;
    private String badge;
    private boolean isDefault;
}
