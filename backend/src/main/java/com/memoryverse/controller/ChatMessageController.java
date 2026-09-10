package com.memoryverse.controller;

import com.memoryverse.dto.request.ChatMessageReactionToggleDto;
import com.memoryverse.dto.request.ChatMessageSendDto;
import com.memoryverse.dto.request.ChatMessageUpdateDto;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.ChatMessageDto;
import com.memoryverse.dto.response.ChatMessageReactionDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.ChatMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatMessageController {

    private final ChatMessageService chatMessageService;

    @GetMapping("/groups/{groupId}/messages")
    public ResponseEntity<ApiResponse<PagedResponse<ChatMessageDto>>> getGroupMessages(
            @PathVariable UUID groupId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "30") int size) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        PagedResponse<ChatMessageDto> messages = chatMessageService.getGroupMessages(groupId, currentUserId, page, size);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    @GetMapping("/groups/{groupId}/messages/search")
    public ResponseEntity<ApiResponse<PagedResponse<com.memoryverse.dto.response.ChatMessageSearchResultDto>>> searchGroupMessages(
            @PathVariable UUID groupId,
            @RequestParam("q") String query,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        PagedResponse<com.memoryverse.dto.response.ChatMessageSearchResultDto> results =
                chatMessageService.searchGroupMessages(groupId, query, page, size, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/groups/{groupId}/media")
    public ResponseEntity<ApiResponse<PagedResponse<com.memoryverse.dto.response.ChatMediaItemDto>>> getGroupMedia(
            @PathVariable UUID groupId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "30") int size) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        PagedResponse<com.memoryverse.dto.response.ChatMediaItemDto> media =
                chatMessageService.getGroupMedia(groupId, page, size, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(media));
    }

    @GetMapping("/groups/{groupId}/files")
    public ResponseEntity<ApiResponse<PagedResponse<com.memoryverse.dto.response.ChatMediaItemDto>>> getGroupFiles(
            @PathVariable UUID groupId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "30") int size) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        PagedResponse<com.memoryverse.dto.response.ChatMediaItemDto> files =
                chatMessageService.getGroupFiles(groupId, page, size, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(files));
    }

    @GetMapping("/groups/{groupId}/messages/{messageId}/document-url")
    public ResponseEntity<ApiResponse<com.memoryverse.dto.response.SignedDocumentUrlResponseDto>> getDocumentSignedUrl(
            @PathVariable UUID groupId,
            @PathVariable UUID messageId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        com.memoryverse.dto.response.SignedDocumentUrlResponseDto response =
                chatMessageService.getDocumentSignedUrl(groupId, messageId, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/groups/{groupId}/messages")
    public ResponseEntity<ApiResponse<ChatMessageDto>> sendMessage(
            @PathVariable UUID groupId,
            @Valid @RequestBody ChatMessageSendDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        dto.setChatGroupId(groupId);
        ChatMessageDto sent = chatMessageService.sendMessage(dto, currentUserId);
        return new ResponseEntity<>(ApiResponse.success("Message sent successfully", sent), HttpStatus.CREATED);
    }

    @PostMapping(value = "/groups/{groupId}/images", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ChatMessageDto>> uploadImageMessage(
            @PathVariable UUID groupId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "clientMessageId", required = false) String clientMessageId,
            @RequestParam(value = "replyToMessageId", required = false) UUID replyToMessageId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        ChatMessageDto sent = chatMessageService.sendImageMessage(groupId, file, caption, clientMessageId, replyToMessageId, currentUserId);
        return new ResponseEntity<>(ApiResponse.success("Image message sent successfully", sent), HttpStatus.CREATED);
    }

    @PostMapping(value = "/groups/{groupId}/videos", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ChatMessageDto>> uploadVideoMessage(
            @PathVariable UUID groupId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "clientMessageId", required = false) String clientMessageId,
            @RequestParam(value = "replyToMessageId", required = false) UUID replyToMessageId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        ChatMessageDto sent = chatMessageService.sendVideoMessage(groupId, file, caption, clientMessageId, replyToMessageId, currentUserId);
        return new ResponseEntity<>(ApiResponse.success("Video message sent successfully", sent), HttpStatus.CREATED);
    }

    @PostMapping(value = "/groups/{groupId}/files", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ChatMessageDto>> uploadFileMessage(
            @PathVariable UUID groupId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "clientMessageId", required = false) String clientMessageId,
            @RequestParam(value = "replyToMessageId", required = false) UUID replyToMessageId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        ChatMessageDto sent = chatMessageService.sendFileMessage(groupId, file, caption, clientMessageId, replyToMessageId, currentUserId);
        return new ResponseEntity<>(ApiResponse.success("File message sent successfully", sent), HttpStatus.CREATED);
    }

    @PatchMapping("/messages/{messageId}")
    public ResponseEntity<ApiResponse<ChatMessageDto>> editMessage(
            @PathVariable UUID messageId,
            @Valid @RequestBody ChatMessageUpdateDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        ChatMessageDto updated = chatMessageService.editMessage(messageId, dto.getTextContent(), currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Message edited successfully", updated));
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(
            @PathVariable UUID messageId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        chatMessageService.deleteMessage(messageId, currentUserId);
        return ResponseEntity.ok(ApiResponse.message("Message deleted successfully"));
    }

    @PostMapping("/messages/{messageId}/reactions")
    public ResponseEntity<ApiResponse<Void>> toggleReaction(
            @PathVariable UUID messageId,
            @Valid @RequestBody ChatMessageReactionToggleDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        chatMessageService.toggleReaction(messageId, dto.getReactionCode(), currentUserId);
        return ResponseEntity.ok(ApiResponse.message("Reaction updated successfully"));
    }

    @GetMapping("/messages/{messageId}/reactions")
    public ResponseEntity<ApiResponse<List<ChatMessageReactionDto>>> getMessageReactions(
            @PathVariable UUID messageId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        List<ChatMessageReactionDto> reactions = chatMessageService.getMessageReactions(messageId, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(reactions));
    }
}
