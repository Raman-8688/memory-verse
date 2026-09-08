package com.memoryverse.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MomentUpdateDto {

    @Size(max = 2000, message = "Caption must not exceed 2000 characters")
    private String caption;
}
