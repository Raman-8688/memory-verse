package com.memoryverse.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageReactionUpdatedDto {
    private UUID messageId;
    private List<ChatMessageReactionDto> reactions;
}
