package com.memoryverse.dto.request;

import com.memoryverse.entity.SharedResourceType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSharedLinkRequestDto {

    @NotNull(message = "Resource type is required")
    private SharedResourceType resourceType;

    @NotNull(message = "Resource ID is required")
    private UUID resourceId;

    private Integer expiresInDays;
}
