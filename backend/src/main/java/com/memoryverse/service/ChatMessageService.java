package com.memoryverse.service;

import com.memoryverse.dto.request.ChatMessageSendDto;
import com.memoryverse.dto.response.ChatMediaItemDto;
import com.memoryverse.dto.response.ChatMessageDto;
import com.memoryverse.dto.response.ChatMessageReactionDto;
import com.memoryverse.dto.response.ChatMessageSearchResultDto;
import com.memoryverse.dto.response.PagedResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface ChatMessageService {

    PagedResponse<ChatMessageDto> getGroupMessages(UUID groupId, UUID currentUserId, int page, int size);

    ChatMessageDto sendMessage(ChatMessageSendDto dto, UUID currentUserId);

    ChatMessageDto sendImageMessage(UUID groupId, MultipartFile file, String caption, String clientMessageId, UUID replyToMessageId, UUID currentUserId);

    ChatMessageDto sendVideoMessage(UUID groupId, MultipartFile file, String caption, String clientMessageId, UUID replyToMessageId, UUID currentUserId);

    ChatMessageDto sendFileMessage(UUID groupId, MultipartFile file, String caption, String clientMessageId, UUID replyToMessageId, UUID currentUserId);

    ChatMessageDto editMessage(UUID messageId, String textContent, UUID currentUserId);

    void deleteMessage(UUID messageId, UUID currentUserId);

    void toggleReaction(UUID messageId, String reactionCode, UUID currentUserId);

    List<ChatMessageReactionDto> getMessageReactions(UUID messageId, UUID currentUserId);

    void markMessagesAsRead(UUID groupId, UUID lastReadMessageId, UUID currentUserId);

    void broadcastTyping(UUID groupId, UUID currentUserId, String displayName, boolean typing);

    PagedResponse<ChatMessageSearchResultDto> searchGroupMessages(UUID groupId, String query, int page, int size, UUID currentUserId);

    PagedResponse<ChatMediaItemDto> getGroupMedia(UUID groupId, int page, int size, UUID currentUserId);

    PagedResponse<ChatMediaItemDto> getGroupFiles(UUID groupId, int page, int size, UUID currentUserId);

    com.memoryverse.dto.response.SignedDocumentUrlResponseDto getDocumentSignedUrl(UUID groupId, UUID messageId, UUID currentUserId);
}
