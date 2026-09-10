package com.memoryverse.dto.request;

import com.memoryverse.entity.ChatGroupRole;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroupRoleUpdateDto {
    @NotNull(message = "Role is required")
    private ChatGroupRole role;
}
