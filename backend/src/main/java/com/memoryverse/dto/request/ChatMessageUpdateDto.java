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
public class ChatMessageUpdateDto {

    @NotBlank(message = "Message text cannot be empty")
    @Size(max = 4000, message = "Message text cannot exceed 4000 characters")
    private String textContent;
}
