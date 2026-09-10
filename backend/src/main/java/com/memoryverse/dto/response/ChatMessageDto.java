package com.memoryverse.dto.response;

import com.memoryverse.entity.ChatMessage;
import com.memoryverse.entity.ChatMessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDto {
    private UUID id;
    private UUID chatGroupId;
    private UserDto sender;
    private ChatMessageType messageType;
    private String textContent;
    private String mediaUrl;
    private String mediaPublicId;
    private String thumbnailUrl;
    private Integer mediaWidth;
    private Integer mediaHeight;
    private String mediaFormat;
    private Long mediaBytes;
    private Double mediaDuration;
    private String originalFileName;
    private ChatMessageDto replyToMessage;
    private String clientMessageId;
    private boolean edited;
    private boolean deleted;
    private Instant deletedAt;
    private List<ChatMessageReactionDto> reactions;
    private List<ChatMessageMentionDto> mentions;
    private Instant createdAt;
    private Instant updatedAt;

    public static ChatMessageDto fromEntity(ChatMessage message) {
        return fromEntity(message, true);
    }

    public static ChatMessageDto fromEntity(ChatMessage message, boolean includeReply) {
        if (message == null) return null;

        List<ChatMessageReactionDto> reactionDtos = (message.getReactions() == null || message.getReactions().isEmpty())
                ? Collections.emptyList()
                : message.getReactions().stream()
                .map(ChatMessageReactionDto::fromEntity)
                .collect(Collectors.toList());

        List<ChatMessageMentionDto> mentionDtos = (message.getMentions() == null || message.getMentions().isEmpty())
                ? Collections.emptyList()
                : message.getMentions().stream()
                .map(ChatMessageMentionDto::fromEntity)
                .collect(Collectors.toList());

        ChatMessageDto replyDto = null;
        if (includeReply && message.getReplyToMessage() != null) {
            replyDto = fromEntity(message.getReplyToMessage(), false);
        }

        return ChatMessageDto.builder()
                .id(message.getId())
                .chatGroupId(message.getChatGroup() != null ? message.getChatGroup().getId() : null)
                .sender(UserDto.fromEntity(message.getSender()))
                .messageType(message.getMessageType())
                .textContent(message.isDeleted() ? "This message was deleted" : message.getTextContent())
                .mediaUrl(message.isDeleted() ? null : message.getMediaUrl())
                .mediaPublicId(message.isDeleted() ? null : message.getMediaPublicId())
                .thumbnailUrl(message.isDeleted() ? null : message.getThumbnailUrl())
                .mediaWidth(message.isDeleted() ? null : message.getMediaWidth())
                .mediaHeight(message.isDeleted() ? null : message.getMediaHeight())
                .mediaFormat(message.isDeleted() ? null : message.getMediaFormat())
                .mediaBytes(message.isDeleted() ? null : message.getMediaBytes())
                .mediaDuration(message.isDeleted() ? null : message.getMediaDuration())
                .originalFileName(message.isDeleted() ? null : message.getOriginalFileName())
                .replyToMessage(replyDto)
                .clientMessageId(message.getClientMessageId())
                .edited(message.isEdited())
                .deleted(message.isDeleted())
                .deletedAt(message.getDeletedAt())
                .reactions(reactionDtos)
                .mentions(mentionDtos)
                .createdAt(message.getCreatedAt())
                .updatedAt(message.getUpdatedAt())
                .build();
    }
}
