package com.memoryverse.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroupCreateDto {

    @NotBlank(message = "Group name is required")
    @Size(min = 1, max = 100, message = "Group name must be between 1 and 100 characters")
    private String name;

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    @Size(max = 1000, message = "Avatar URL cannot exceed 1000 characters")
    private String avatarUrl;

    @Size(max = 255, message = "Avatar public ID cannot exceed 255 characters")
    private String avatarPublicId;

    @Builder.Default
    private List<UUID> memberUserIds = new ArrayList<>();
}
