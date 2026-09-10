package com.memoryverse.dto.request;

import com.memoryverse.entity.ChatMessageType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageSendDto {

    @NotNull(message = "Chat group ID is required")
    private UUID chatGroupId;

    @Builder.Default
    private ChatMessageType messageType = ChatMessageType.TEXT;

    private String textContent;

    @Size(max = 1000, message = "Media URL cannot exceed 1000 characters")
    private String mediaUrl;

    @Size(max = 255, message = "Media public ID cannot exceed 255 characters")
    private String mediaPublicId;

    @Size(max = 1000, message = "Thumbnail URL cannot exceed 1000 characters")
    private String thumbnailUrl;

    private UUID replyToMessageId;

    @Size(max = 100, message = "Client message ID cannot exceed 100 characters")
    private String clientMessageId;

    private java.util.Set<UUID> mentionedUserIds;
}
