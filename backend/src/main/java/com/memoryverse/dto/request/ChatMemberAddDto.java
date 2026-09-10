package com.memoryverse.dto.request;

import com.memoryverse.entity.ChatGroupRole;
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
public class ChatMemberAddDto {

    private UUID userId;
    private String email;

    @Builder.Default
    private ChatGroupRole role = ChatGroupRole.MEMBER;
}
