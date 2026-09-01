package com.memoryverse.modules.ai.dto;

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
