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
public class AiNarrativeRequestDto {

    @NotBlank(message = "Rough notes cannot be blank")
    private String roughNotes;

    private String memoryTitle;

    private String locationName;

    private String model;
}
