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
public class ChatMessageReactionToggleDto {

    @NotBlank(message = "Reaction code is required")
    @Size(min = 1, max = 32, message = "Reaction code must be between 1 and 32 characters")
    private String reactionCode;
}
