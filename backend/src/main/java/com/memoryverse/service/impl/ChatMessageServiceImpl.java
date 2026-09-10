package com.memoryverse.service.impl;

import com.memoryverse.service.ChatMessageService;
import com.memoryverse.dto.request.ChatMessageSendDto;
import com.memoryverse.dto.response.ChatMediaItemDto;
import com.memoryverse.dto.response.ChatMessageDto;
import com.memoryverse.dto.response.ChatMessageReactionDto;
import com.memoryverse.dto.response.ChatMessageSearchResultDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.entity.ChatGroup;
import com.memoryverse.entity.ChatGroupMember;
import com.memoryverse.entity.ChatGroupRole;
import com.memoryverse.entity.ChatMessage;
import com.memoryverse.entity.ChatMessageMention;
import com.memoryverse.entity.ChatMessageReaction;
import com.memoryverse.entity.ChatMessageType;
import com.memoryverse.entity.User;
import com.memoryverse.exception.BusinessValidationException;
import com.memoryverse.exception.ForbiddenException;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.repository.ChatGroupMemberRepository;
import com.memoryverse.repository.ChatGroupRepository;
import com.memoryverse.repository.ChatMessageReactionRepository;
import com.memoryverse.repository.ChatMessageRepository;
import com.memoryverse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatMessageServiceImpl implements ChatMessageService {

    public static final Set<String> ALLOWED_REACTIONS = Set.of(
            "❤️", "😂", "🔥", "👍", "👏", "🥹", "😍", "😮", "🎉", "🙌"
    );

    public static final Set<String> ALLOWED_IMAGE_MIMES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
    );

    public static final long MAX_IMAGE_SIZE_BYTES = 15L * 1024 * 1024; // 15 MB
    public static final int MAX_TEXT_LENGTH = 4000;

    private final ChatMessageRepository chatMessageRepository;
    private final ChatMessageReactionRepository chatMessageReactionRepository;
    private final com.memoryverse.repository.ChatMessageMentionRepository chatMessageMentionRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final UserRepository userRepository;
    private final com.memoryverse.service.NotificationService notificationService;
    private final com.memoryverse.integration.storage.CloudinaryStorageService cloudinaryStorageService;
    private final com.memoryverse.service.ChatRealtimeEventPublisher chatRealtimeEventPublisher;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ChatMessageDto> getGroupMessages(UUID groupId, UUID currentUserId, int page, int size) {
        verifyMembership(groupId, currentUserId);

        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<ChatMessage> messagePage = chatMessageRepository.findByChatGroupIdOrderByCreatedAtDesc(groupId, pageable);
        Page<ChatMessageDto> dtoPage = messagePage.map(ChatMessageDto::fromEntity);

        return PagedResponse.fromPage(dtoPage);
    }

    @Override
    @Transactional
    public ChatMessageDto sendMessage(ChatMessageSendDto dto, UUID currentUserId) {
        verifyMembership(dto.getChatGroupId(), currentUserId);

        ChatGroup group = chatGroupRepository.findById(dto.getChatGroupId())
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + dto.getChatGroupId()));

        if (group.isArchived()) {
            throw new BusinessValidationException("Cannot send messages to an archived group");
        }

        // 1. Idempotency / Duplicate protection
        if (dto.getClientMessageId() != null && !dto.getClientMessageId().isBlank()) {
            String trimmedClientMsgId = dto.getClientMessageId().trim();
            Optional<ChatMessage> existing = chatMessageRepository
                    .findByChatGroupIdAndSenderIdAndClientMessageId(group.getId(), currentUserId, trimmedClientMsgId);
            if (existing.isPresent()) {
                log.info("Duplicate message detected with clientMessageId [{}] for user [{}] in group [{}]. Returning existing message.",
                        trimmedClientMsgId, currentUserId, group.getId());
                return ChatMessageDto.fromEntity(existing.get());
            }
        }

        // 2. Validate message content
        ChatMessageType msgType = dto.getMessageType() != null ? dto.getMessageType() : ChatMessageType.TEXT;
        String text = dto.getTextContent() != null ? dto.getTextContent().trim() : null;

        if (msgType == ChatMessageType.TEXT) {
            if (text == null || text.isBlank()) {
                throw new BusinessValidationException("Message text content cannot be empty");
            }
            if (text.length() > MAX_TEXT_LENGTH) {
                throw new BusinessValidationException("Message text cannot exceed " + MAX_TEXT_LENGTH + " characters");
            }
        }

        // 3. Validate reply target if present
        ChatMessage replyTo = null;
        if (dto.getReplyToMessageId() != null) {
            replyTo = chatMessageRepository.findById(dto.getReplyToMessageId())
                    .orElseThrow(() -> new ResourceNotFoundException("Reply target message not found with id: " + dto.getReplyToMessageId()));

            if (!replyTo.getChatGroup().getId().equals(group.getId())) {
                throw new BusinessValidationException("Reply target message must belong to the same chat group");
            }
        }

        User sender = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + currentUserId));

        ChatMessage message = ChatMessage.builder()
                .chatGroup(group)
                .sender(sender)
                .messageType(msgType)
                .textContent(text)
                .mediaUrl(dto.getMediaUrl())
                .mediaPublicId(dto.getMediaPublicId())
                .thumbnailUrl(dto.getThumbnailUrl())
                .replyToMessage(replyTo)
                .clientMessageId(dto.getClientMessageId() != null && !dto.getClientMessageId().isBlank() ? dto.getClientMessageId().trim() : null)
                .edited(false)
                .deleted(false)
                .build();

        ChatMessage saved;
        try {
            saved = chatMessageRepository.save(message);
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            if (dto.getClientMessageId() != null && !dto.getClientMessageId().isBlank()) {
                String trimmedClientMsgId = dto.getClientMessageId().trim();
                Optional<ChatMessage> existing = chatMessageRepository
                        .findByChatGroupIdAndSenderIdAndClientMessageId(group.getId(), currentUserId, trimmedClientMsgId);
                if (existing.isPresent()) {
                    log.info("Concurrent duplicate message resolved via database constraint for clientMessageId [{}]", trimmedClientMsgId);
                    return ChatMessageDto.fromEntity(existing.get());
                }
            }
            throw dive;
        }

        // Update group timestamp to push it to the top of chat list
        group.setUpdatedAt(Instant.now());
        chatGroupRepository.save(group);

        // Automatically update the sender's last read pointer
        chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), currentUserId)
                .ifPresent(member -> {
                    member.setLastReadMessageId(saved.getId());
                    member.setLastReadAt(saved.getCreatedAt());
                    chatGroupMemberRepository.save(member);
                });

        processMentionsAndNotifications(saved, group, sender, dto.getMentionedUserIds(), replyTo, text);

        log.info("Sent chat message [{}] to group [{}] by user [{}]", saved.getId(), group.getId(), currentUserId);
        ChatMessageDto result = ChatMessageDto.fromEntity(saved);
        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishMessageCreated(group.getId(), result);
        }
        return result;
    }

    @Override
    @Transactional
    public ChatMessageDto sendImageMessage(UUID groupId, org.springframework.web.multipart.MultipartFile file, String caption, String clientMessageId, UUID replyToMessageId, UUID currentUserId) {
        verifyMembership(groupId, currentUserId);

        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        if (group.isArchived()) {
            throw new BusinessValidationException("Cannot send messages to an archived group");
        }

        // 1. Idempotency / Duplicate protection
        if (clientMessageId != null && !clientMessageId.isBlank()) {
            String trimmedClientMsgId = clientMessageId.trim();
            Optional<ChatMessage> existing = chatMessageRepository
                    .findByChatGroupIdAndSenderIdAndClientMessageId(group.getId(), currentUserId, trimmedClientMsgId);
            if (existing.isPresent()) {
                log.info("Duplicate image message detected with clientMessageId [{}] for user [{}] in group [{}]. Returning existing message.",
                        trimmedClientMsgId, currentUserId, group.getId());
                return ChatMessageDto.fromEntity(existing.get());
            }
        }

        // 2. Server-side File Validation
        if (file == null || file.isEmpty()) {
            throw new BusinessValidationException("Image file cannot be empty");
        }

        if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new BusinessValidationException("Image exceeds maximum allowed size of 15MB");
        }

        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase().trim() : "";
        if (!ALLOWED_IMAGE_MIMES.contains(contentType)) {
            throw new BusinessValidationException("Invalid image format. Allowed formats are: JPEG, PNG, WEBP, GIF");
        }

        // 3. Validate reply target if present
        ChatMessage replyTo = null;
        if (replyToMessageId != null) {
            replyTo = chatMessageRepository.findById(replyToMessageId)
                    .orElseThrow(() -> new ResourceNotFoundException("Reply target message not found with id: " + replyToMessageId));

            if (!replyTo.getChatGroup().getId().equals(group.getId())) {
                throw new BusinessValidationException("Reply target message must belong to the same chat group");
            }
        }

        // 4. Upload to Cloudinary (or local storage fallback)
        com.memoryverse.dto.response.UploadedMediaResult uploadResult = cloudinaryStorageService.uploadFile(file);
        if (uploadResult == null || uploadResult.getMediaUrl() == null) {
            throw new BusinessValidationException("Failed to upload image media to storage");
        }

        // 5. Database Persistence with Orphan Asset Cleanup
        ChatMessage saved;
        try {
            User sender = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + currentUserId));

            String text = (caption != null && !caption.isBlank()) ? caption.trim() : null;
            if (text != null && text.length() > MAX_TEXT_LENGTH) {
                text = text.substring(0, MAX_TEXT_LENGTH);
            }

            ChatMessage message = ChatMessage.builder()
                    .chatGroup(group)
                    .sender(sender)
                    .messageType(ChatMessageType.IMAGE)
                    .textContent(text)
                    .mediaUrl(uploadResult.getMediaUrl())
                    .mediaPublicId(uploadResult.getPublicId())
                    .thumbnailUrl(uploadResult.getThumbnailUrl())
                    .mediaWidth(uploadResult.getWidth())
                    .mediaHeight(uploadResult.getHeight())
                    .mediaFormat(uploadResult.getMediaType() != null ? uploadResult.getMediaType().name() : "IMAGE")
                    .mediaBytes(uploadResult.getFileSizeBytes() != null ? uploadResult.getFileSizeBytes() : file.getSize())
                    .replyToMessage(replyTo)
                    .clientMessageId(clientMessageId != null && !clientMessageId.isBlank() ? clientMessageId.trim() : null)
                    .edited(false)
                    .deleted(false)
                    .build();

            saved = chatMessageRepository.save(message);

            group.setUpdatedAt(Instant.now());
            chatGroupRepository.save(group);

            chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), currentUserId)
                    .ifPresent(member -> {
                        member.setLastReadMessageId(saved.getId());
                        member.setLastReadAt(saved.getCreatedAt());
                        chatGroupMemberRepository.save(member);
                    });
            processMentionsAndNotifications(saved, group, sender, null, replyTo, caption);
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            log.info("Concurrent duplicate image message caught by DB constraint for clientMessageId [{}]", clientMessageId);
            try {
                if (uploadResult.getPublicId() != null) {
                    cloudinaryStorageService.deleteFile(uploadResult.getPublicId(), com.memoryverse.entity.MediaType.IMAGE);
                }
            } catch (Exception cleanupEx) {
                log.warn("Failed to cleanup duplicate upload asset: {}", cleanupEx.getMessage());
            }
            if (clientMessageId != null && !clientMessageId.isBlank()) {
                Optional<ChatMessage> existing = chatMessageRepository
                        .findByChatGroupIdAndSenderIdAndClientMessageId(group.getId(), currentUserId, clientMessageId.trim());
                if (existing.isPresent()) {
                    return ChatMessageDto.fromEntity(existing.get());
                }
            }
            throw dive;
        } catch (Exception ex) {
            log.error("Failed to persist image message for group [{}] after Cloudinary upload. Triggering orphan asset cleanup for publicId [{}]",
                    groupId, uploadResult.getPublicId(), ex);
            try {
                if (uploadResult.getPublicId() != null) {
                    cloudinaryStorageService.deleteFile(uploadResult.getPublicId(), com.memoryverse.entity.MediaType.IMAGE);
                }
            } catch (Exception cleanupEx) {
                log.error("Failed to cleanup orphaned Cloudinary asset [{}]", uploadResult.getPublicId(), cleanupEx);
            }
            throw ex;
        }

        log.info("Sent image chat message [{}] to group [{}] by user [{}]", saved.getId(), group.getId(), currentUserId);
        ChatMessageDto result = ChatMessageDto.fromEntity(saved);
        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishMessageCreated(group.getId(), result);
        }
        return result;
    }

    @Override
    @Transactional
    public ChatMessageDto sendVideoMessage(UUID groupId, org.springframework.web.multipart.MultipartFile file, String caption, String clientMessageId, UUID replyToMessageId, UUID currentUserId) {
        verifyMembership(groupId, currentUserId);

        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        if (group.isArchived()) {
            throw new BusinessValidationException("Cannot send messages to an archived group");
        }

        // 1. Idempotency / Duplicate protection
        if (clientMessageId != null && !clientMessageId.isBlank()) {
            String trimmedClientMsgId = clientMessageId.trim();
            Optional<ChatMessage> existing = chatMessageRepository
                    .findByChatGroupIdAndSenderIdAndClientMessageId(group.getId(), currentUserId, trimmedClientMsgId);
            if (existing.isPresent()) {
                log.info("Duplicate video message detected with clientMessageId [{}] for user [{}] in group [{}]. Returning existing message.",
                        trimmedClientMsgId, currentUserId, group.getId());
                return ChatMessageDto.fromEntity(existing.get());
            }
        }

        // 2. Validate reply target if present
        ChatMessage replyTo = null;
        if (replyToMessageId != null) {
            replyTo = chatMessageRepository.findById(replyToMessageId)
                    .orElseThrow(() -> new ResourceNotFoundException("Reply target message not found with id: " + replyToMessageId));

            if (!replyTo.getChatGroup().getId().equals(group.getId())) {
                throw new BusinessValidationException("Reply target message must belong to the same chat group");
            }
        }

        // 3. Upload video to storage (Cloudinary or local)
        com.memoryverse.dto.response.UploadedMediaResult uploadResult = cloudinaryStorageService.uploadVideo(file);
        if (uploadResult == null || uploadResult.getMediaUrl() == null) {
            throw new BusinessValidationException("Failed to upload video media to storage");
        }

        // 4. Database Persistence with Orphan Asset Cleanup
        ChatMessage saved;
        try {
            User sender = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + currentUserId));

            String text = (caption != null && !caption.isBlank()) ? caption.trim() : null;
            if (text != null && text.length() > MAX_TEXT_LENGTH) {
                text = text.substring(0, MAX_TEXT_LENGTH);
            }

            ChatMessage message = ChatMessage.builder()
                    .chatGroup(group)
                    .sender(sender)
                    .messageType(ChatMessageType.VIDEO)
                    .textContent(text)
                    .mediaUrl(uploadResult.getMediaUrl())
                    .mediaPublicId(uploadResult.getPublicId())
                    .thumbnailUrl(uploadResult.getThumbnailUrl())
                    .mediaWidth(uploadResult.getWidth())
                    .mediaHeight(uploadResult.getHeight())
                    .mediaDuration(uploadResult.getDurationSeconds() != null ? uploadResult.getDurationSeconds().doubleValue() : null)
                    .mediaFormat(uploadResult.getFormat() != null ? uploadResult.getFormat() : "mp4")
                    .mediaBytes(uploadResult.getFileSizeBytes() != null ? uploadResult.getFileSizeBytes() : file.getSize())
                    .originalFileName(uploadResult.getFileName())
                    .replyToMessage(replyTo)
                    .clientMessageId(clientMessageId != null && !clientMessageId.isBlank() ? clientMessageId.trim() : null)
                    .edited(false)
                    .deleted(false)
                    .build();

            saved = chatMessageRepository.save(message);

            group.setUpdatedAt(Instant.now());
            chatGroupRepository.save(group);

            chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), currentUserId)
                    .ifPresent(member -> {
                        member.setLastReadMessageId(saved.getId());
                        member.setLastReadAt(saved.getCreatedAt());
                        chatGroupMemberRepository.save(member);
                    });
            processMentionsAndNotifications(saved, group, sender, null, replyTo, caption);
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            log.info("Concurrent duplicate video message caught by DB constraint for clientMessageId [{}]", clientMessageId);
            try {
                if (uploadResult.getPublicId() != null) {
                    cloudinaryStorageService.deleteResource(uploadResult.getPublicId(), "video");
                }
            } catch (Exception cleanupEx) {
                log.warn("Failed to cleanup duplicate video asset: {}", cleanupEx.getMessage());
            }
            if (clientMessageId != null && !clientMessageId.isBlank()) {
                Optional<ChatMessage> existing = chatMessageRepository
                        .findByChatGroupIdAndSenderIdAndClientMessageId(group.getId(), currentUserId, clientMessageId.trim());
                if (existing.isPresent()) {
                    return ChatMessageDto.fromEntity(existing.get());
                }
            }
            throw dive;
        } catch (Exception ex) {
            log.error("Failed to persist video message for group [{}] after Cloudinary upload. Triggering orphan asset cleanup for publicId [{}]",
                    groupId, uploadResult.getPublicId(), ex);
            try {
                if (uploadResult.getPublicId() != null) {
                    cloudinaryStorageService.deleteResource(uploadResult.getPublicId(), "video");
                }
            } catch (Exception cleanupEx) {
                log.error("Failed to cleanup orphaned Cloudinary video asset [{}]", uploadResult.getPublicId(), cleanupEx);
            }
            throw ex;
        }

        log.info("Sent video chat message [{}] to group [{}] by user [{}]", saved.getId(), group.getId(), currentUserId);
        ChatMessageDto result = ChatMessageDto.fromEntity(saved);
        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishMessageCreated(group.getId(), result);
        }
        return result;
    }

    @Override
    @Transactional
    public ChatMessageDto sendFileMessage(UUID groupId, org.springframework.web.multipart.MultipartFile file, String caption, String clientMessageId, UUID replyToMessageId, UUID currentUserId) {
        verifyMembership(groupId, currentUserId);

        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        if (group.isArchived()) {
            throw new BusinessValidationException("Cannot send messages to an archived group");
        }

        // 1. Idempotency / Duplicate protection
        if (clientMessageId != null && !clientMessageId.isBlank()) {
            String trimmedClientMsgId = clientMessageId.trim();
            Optional<ChatMessage> existing = chatMessageRepository
                    .findByChatGroupIdAndSenderIdAndClientMessageId(group.getId(), currentUserId, trimmedClientMsgId);
            if (existing.isPresent()) {
                log.info("Duplicate file message detected with clientMessageId [{}] for user [{}] in group [{}]. Returning existing message.",
                        trimmedClientMsgId, currentUserId, group.getId());
                return ChatMessageDto.fromEntity(existing.get());
            }
        }

        // 2. Validate reply target if present
        ChatMessage replyTo = null;
        if (replyToMessageId != null) {
            replyTo = chatMessageRepository.findById(replyToMessageId)
                    .orElseThrow(() -> new ResourceNotFoundException("Reply target message not found with id: " + replyToMessageId));

            if (!replyTo.getChatGroup().getId().equals(group.getId())) {
                throw new BusinessValidationException("Reply target message must belong to the same chat group");
            }
        }

        // 3. Upload document to storage (Cloudinary or local)
        com.memoryverse.dto.response.UploadedMediaResult uploadResult = cloudinaryStorageService.uploadDocument(file);
        if (uploadResult == null || uploadResult.getMediaUrl() == null) {
            throw new BusinessValidationException("Failed to upload document to storage");
        }

        // 4. Database Persistence with Orphan Asset Cleanup
        ChatMessage saved;
        try {
            User sender = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + currentUserId));

            String text = (caption != null && !caption.isBlank()) ? caption.trim() : null;
            if (text != null && text.length() > MAX_TEXT_LENGTH) {
                text = text.substring(0, MAX_TEXT_LENGTH);
            }

            ChatMessage message = ChatMessage.builder()
                    .chatGroup(group)
                    .sender(sender)
                    .messageType(ChatMessageType.FILE)
                    .textContent(text)
                    .mediaUrl(uploadResult.getMediaUrl())
                    .mediaPublicId(uploadResult.getPublicId())
                    .thumbnailUrl(null)
                    .mediaFormat(uploadResult.getFormat())
                    .mediaBytes(uploadResult.getFileSizeBytes() != null ? uploadResult.getFileSizeBytes() : file.getSize())
                    .originalFileName(uploadResult.getFileName())
                    .replyToMessage(replyTo)
                    .clientMessageId(clientMessageId != null && !clientMessageId.isBlank() ? clientMessageId.trim() : null)
                    .edited(false)
                    .deleted(false)
                    .build();

            saved = chatMessageRepository.save(message);

            group.setUpdatedAt(Instant.now());
            chatGroupRepository.save(group);

            chatGroupMemberRepository.findByChatGroupIdAndUserId(group.getId(), currentUserId)
                    .ifPresent(member -> {
                        member.setLastReadMessageId(saved.getId());
                        member.setLastReadAt(saved.getCreatedAt());
                        chatGroupMemberRepository.save(member);
                    });
            processMentionsAndNotifications(saved, group, sender, null, replyTo, caption);
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            log.info("Concurrent duplicate file message caught by DB constraint for clientMessageId [{}]", clientMessageId);
            try {
                if (uploadResult.getPublicId() != null) {
                    cloudinaryStorageService.deleteResource(uploadResult.getPublicId(), "raw");
                }
            } catch (Exception cleanupEx) {
                log.warn("Failed to cleanup duplicate file asset: {}", cleanupEx.getMessage());
            }
            if (clientMessageId != null && !clientMessageId.isBlank()) {
                Optional<ChatMessage> existing = chatMessageRepository
                        .findByChatGroupIdAndSenderIdAndClientMessageId(group.getId(), currentUserId, clientMessageId.trim());
                if (existing.isPresent()) {
                    return ChatMessageDto.fromEntity(existing.get());
                }
            }
            throw dive;
        } catch (Exception ex) {
            log.error("Failed to persist file message for group [{}] after Cloudinary upload. Triggering orphan asset cleanup for publicId [{}]",
                    groupId, uploadResult.getPublicId(), ex);
            try {
                if (uploadResult.getPublicId() != null) {
                    cloudinaryStorageService.deleteResource(uploadResult.getPublicId(), "raw");
                }
            } catch (Exception cleanupEx) {
                log.error("Failed to cleanup orphaned Cloudinary document asset [{}]", uploadResult.getPublicId(), cleanupEx);
            }
            throw ex;
        }

        log.info("Sent document chat message [{}] to group [{}] by user [{}]", saved.getId(), group.getId(), currentUserId);
        ChatMessageDto result = ChatMessageDto.fromEntity(saved);
        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishMessageCreated(group.getId(), result);
        }
        return result;
    }

    @Override
    @Transactional
    public ChatMessageDto editMessage(UUID messageId, String textContent, UUID currentUserId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        if (!message.getSender().getId().equals(currentUserId)) {
            throw new ForbiddenException("You can only edit your own messages");
        }

        if (message.isDeleted()) {
            throw new BusinessValidationException("Cannot edit a deleted message");
        }

        if (message.getMessageType() != ChatMessageType.TEXT) {
            throw new BusinessValidationException("Only text messages can be edited");
        }

        if (textContent == null || textContent.trim().isBlank()) {
            throw new BusinessValidationException("Edited text content cannot be empty");
        }

        String trimmed = textContent.trim();
        if (trimmed.length() > MAX_TEXT_LENGTH) {
            throw new BusinessValidationException("Message text cannot exceed " + MAX_TEXT_LENGTH + " characters");
        }

        message.setTextContent(trimmed);
        message.setEdited(true);

        ChatMessage updated = chatMessageRepository.save(message);
        log.info("Edited message [{}] by user [{}]", messageId, currentUserId);
        ChatMessageDto result = ChatMessageDto.fromEntity(updated);
        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishMessageUpdated(updated.getChatGroup().getId(), result);
        }
        return result;
    }

    @Override
    @Transactional
    public void deleteMessage(UUID messageId, UUID currentUserId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        boolean isSender = message.getSender().getId().equals(currentUserId);
        boolean isAdmin = chatGroupMemberRepository.findByChatGroupIdAndUserId(message.getChatGroup().getId(), currentUserId)
                .map(m -> m.getRole() == ChatGroupRole.ADMIN)
                .orElse(false);

        if (!isSender && !isAdmin) {
            throw new ForbiddenException("Only the message sender or a group admin can delete this message");
        }

        message.setDeleted(true);
        message.setDeletedAt(Instant.now());
        chatMessageRepository.save(message);
        log.info("Soft-deleted message [{}] by user [{}]", messageId, currentUserId);
        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishMessageDeleted(message.getChatGroup().getId(), messageId);
        }
    }

    @Override
    @Transactional
    public void toggleReaction(UUID messageId, String reactionCode, UUID currentUserId) {
        if (reactionCode == null || reactionCode.trim().isBlank()) {
            throw new BusinessValidationException("Reaction code is required");
        }

        String trimmedCode = reactionCode.trim();
        if (!ALLOWED_REACTIONS.contains(trimmedCode)) {
            throw new BusinessValidationException("Invalid reaction code. Allowed reactions are: " + String.join(" ", ALLOWED_REACTIONS));
        }

        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        if (message.isDeleted()) {
            throw new BusinessValidationException("Cannot react to a deleted message");
        }

        verifyMembership(message.getChatGroup().getId(), currentUserId);

        Optional<ChatMessageReaction> existing = chatMessageReactionRepository
                .findByMessageIdAndUserIdAndReactionCode(messageId, currentUserId, trimmedCode);

        if (existing.isPresent()) {
            chatMessageReactionRepository.delete(existing.get());
            chatMessageReactionRepository.flush();
            log.info("Removed reaction [{}] on message [{}] by user [{}]", trimmedCode, messageId, currentUserId);
        } else {
            User user = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + currentUserId));

            ChatMessageReaction reaction = ChatMessageReaction.builder()
                    .message(message)
                    .user(user)
                    .reactionCode(trimmedCode)
                    .build();

            chatMessageReactionRepository.saveAndFlush(reaction);
            log.info("Added reaction [{}] on message [{}] by user [{}]", trimmedCode, messageId, currentUserId);
        }

        if (chatRealtimeEventPublisher != null) {
            List<ChatMessageReactionDto> updatedReactions = chatMessageReactionRepository.findAllByMessageId(messageId)
                    .stream()
                    .map(ChatMessageReactionDto::fromEntity)
                    .toList();
            chatRealtimeEventPublisher.publishReactionUpdated(message.getChatGroup().getId(), messageId, updatedReactions);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageReactionDto> getMessageReactions(UUID messageId, UUID currentUserId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        verifyMembership(message.getChatGroup().getId(), currentUserId);

        List<ChatMessageReaction> reactions = chatMessageReactionRepository.findAllByMessageId(messageId);
        return reactions.stream()
                .map(ChatMessageReactionDto::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public void markMessagesAsRead(UUID groupId, UUID lastReadMessageId, UUID currentUserId) {
        ChatGroupMember member = chatGroupMemberRepository.findByChatGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new ForbiddenException("You are not a member of this chat group"));

        Instant readTimestamp = Instant.now();
        UUID effectiveLastReadMessageId = lastReadMessageId;

        if (lastReadMessageId != null) {
            ChatMessage message = chatMessageRepository.findById(lastReadMessageId)
                    .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + lastReadMessageId));

            if (!message.getChatGroup().getId().equals(groupId)) {
                throw new BusinessValidationException("Message does not belong to the specified chat group");
            }

            // Monotonic check: prevent read marker from moving backwards in time
            if (member.getLastReadAt() != null && message.getCreatedAt() != null && message.getCreatedAt().isBefore(member.getLastReadAt())) {
                log.debug("Ignoring stale read marker [message={}] for user [{}] in group [{}] (existing lastReadAt: {})",
                        lastReadMessageId, currentUserId, groupId, member.getLastReadAt());
                return;
            }

            readTimestamp = message.getCreatedAt() != null ? message.getCreatedAt() : readTimestamp;
            member.setLastReadMessageId(lastReadMessageId);
            member.setLastReadAt(readTimestamp);
        } else {
            Optional<ChatMessage> latest = chatMessageRepository.findLatestMessageInGroup(groupId);
            if (latest.isPresent()) {
                effectiveLastReadMessageId = latest.get().getId();
                readTimestamp = latest.get().getCreatedAt() != null ? latest.get().getCreatedAt() : readTimestamp;
                if (member.getLastReadAt() != null && readTimestamp.isBefore(member.getLastReadAt())) {
                    log.debug("Ignoring stale read marker update for user [{}] in group [{}]", currentUserId, groupId);
                    return;
                }
                member.setLastReadMessageId(effectiveLastReadMessageId);
                member.setLastReadAt(readTimestamp);
            } else {
                if (member.getLastReadAt() == null) {
                    member.setLastReadAt(readTimestamp);
                }
            }
        }

        chatGroupMemberRepository.save(member);
        log.debug("Marked messages as read for group [{}] user [{}] up to message [{}]", groupId, currentUserId, effectiveLastReadMessageId);

        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishMessageRead(groupId, currentUserId, effectiveLastReadMessageId, readTimestamp);
        }
    }

    @Override
    public void broadcastTyping(UUID groupId, UUID currentUserId, String displayName, boolean typing) {
        verifyMembership(groupId, currentUserId);
        if (chatRealtimeEventPublisher != null) {
            chatRealtimeEventPublisher.publishTyping(groupId, currentUserId, displayName, typing);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ChatMessageSearchResultDto> searchGroupMessages(UUID groupId, String query, int page, int size, UUID currentUserId) {
        verifyMembership(groupId, currentUserId);
        if (query == null || query.isBlank()) {
            return PagedResponse.<ChatMessageSearchResultDto>builder()
                    .content(Collections.emptyList())
                    .page(page)
                    .size(size)
                    .totalElements(0)
                    .totalPages(0)
                    .last(true)
                    .build();
        }

        int pageSize = Math.min(Math.max(size, 1), 50);
        int pageNumber = Math.max(page, 0);
        Pageable pageable = PageRequest.of(pageNumber, pageSize);

        Page<ChatMessage> resultPage = chatMessageRepository.searchGroupMessages(groupId, query.trim(), pageable);
        Page<ChatMessageSearchResultDto> dtoPage = resultPage.map(ChatMessageSearchResultDto::fromEntity);

        return PagedResponse.fromPage(dtoPage);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ChatMediaItemDto> getGroupMedia(UUID groupId, int page, int size, UUID currentUserId) {
        verifyMembership(groupId, currentUserId);

        int pageSize = Math.min(Math.max(size, 1), 50);
        int pageNumber = Math.max(page, 0);
        Pageable pageable = PageRequest.of(pageNumber, pageSize);

        Page<ChatMessage> mediaPage = chatMessageRepository.findGroupMediaMessages(groupId, pageable);
        Page<ChatMediaItemDto> dtoPage = mediaPage.map(ChatMediaItemDto::fromEntity);

        return PagedResponse.fromPage(dtoPage);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ChatMediaItemDto> getGroupFiles(UUID groupId, int page, int size, UUID currentUserId) {
        verifyMembership(groupId, currentUserId);

        int pageSize = Math.min(Math.max(size, 1), 50);
        int pageNumber = Math.max(page, 0);
        Pageable pageable = PageRequest.of(pageNumber, pageSize);

        Page<ChatMessage> filePage = chatMessageRepository.findGroupFileMessages(groupId, pageable);
        Page<ChatMediaItemDto> dtoPage = filePage.map(ChatMediaItemDto::fromEntity);

        return PagedResponse.fromPage(dtoPage);
    }

    @Override
    @Transactional(readOnly = true)
    public com.memoryverse.dto.response.SignedDocumentUrlResponseDto getDocumentSignedUrl(UUID groupId, UUID messageId, UUID currentUserId) {
        verifyMembership(groupId, currentUserId);

        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        if (!message.getChatGroup().getId().equals(groupId)) {
            throw new ForbiddenException("Message does not belong to the specified chat group");
        }

        if (message.isDeleted()) {
            throw new BusinessValidationException("Cannot access document from a deleted message");
        }

        if (message.getMessageType() != ChatMessageType.FILE || message.getMediaUrl() == null) {
            throw new BusinessValidationException("Message is not a valid document attachment");
        }

        int expirationSeconds = 300; // 5 minutes
        String signedUrl = cloudinaryStorageService.generateSignedDocumentUrl(
                message.getMediaPublicId(),
                message.getMediaFormat(),
                expirationSeconds
        );

        if (signedUrl == null || signedUrl.isBlank()) {
            signedUrl = message.getMediaUrl();
        }

        return com.memoryverse.dto.response.SignedDocumentUrlResponseDto.builder()
                .messageId(message.getId())
                .url(signedUrl)
                .fileName(message.getOriginalFileName() != null ? message.getOriginalFileName() : "document")
                .expiresAt(Instant.now().plusSeconds(expirationSeconds))
                .build();
    }

    private void verifyMembership(UUID groupId, UUID userId) {
        if (!chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupId, userId)) {
            // Self-healing fallback: If userId is group creator, auto-heal member record
            ChatGroup group = chatGroupRepository.findById(groupId).orElse(null);
            if (group != null && group.getCreatedBy() != null && group.getCreatedBy().getId().equals(userId)) {
                User user = group.getCreatedBy();
                ChatGroupMember creatorMember = ChatGroupMember.builder()
                        .chatGroup(group)
                        .user(user)
                        .role(com.memoryverse.entity.ChatGroupRole.ADMIN)
                        .joinedAt(group.getCreatedAt() != null ? group.getCreatedAt() : Instant.now())
                        .build();
                chatGroupMemberRepository.save(creatorMember);
                return;
            }
            throw new ForbiddenException("You are not a member of this chat group");
        }
    }

    private void processMentionsAndNotifications(
            ChatMessage message,
            ChatGroup group,
            User sender,
            Set<UUID> explicitMentionedUserIds,
            ChatMessage replyTo,
            String textContent) {

        Set<UUID> mentionedUserIds = new java.util.HashSet<>();
        if (explicitMentionedUserIds != null) {
            mentionedUserIds.addAll(explicitMentionedUserIds);
        }

        // Parse @FullName or @username from textContent
        if (textContent != null && textContent.contains("@")) {
            List<ChatGroupMember> groupMembers = chatGroupMemberRepository.findAllByChatGroupId(group.getId());
            for (ChatGroupMember member : groupMembers) {
                User user = member.getUser();
                if (user == null || user.getId().equals(sender.getId())) {
                    continue;
                }
                String fullName = user.getFullName();
                String email = user.getEmail();
                String username = (email != null && email.contains("@")) ? email.substring(0, email.indexOf('@')) : null;

                boolean mentioned = false;
                if (fullName != null && !fullName.isBlank() && textContent.toLowerCase().contains("@" + fullName.toLowerCase())) {
                    mentioned = true;
                } else if (username != null && !username.isBlank() && textContent.toLowerCase().contains("@" + username.toLowerCase())) {
                    mentioned = true;
                }
                if (mentioned) {
                    mentionedUserIds.add(user.getId());
                }
            }
        }

        // Validate each mentioned user ID against group membership
        Set<UUID> notifiedUserIds = new java.util.HashSet<>();
        for (UUID candidateId : mentionedUserIds) {
            if (candidateId == null || candidateId.equals(sender.getId())) {
                continue;
            }

            // Ensure user is an active member of the same group
            boolean isMember = chatGroupMemberRepository.existsByChatGroupIdAndUserId(group.getId(), candidateId);
            if (!isMember) {
                log.warn("Candidate mention user [{}] is not a member of group [{}] - ignoring", candidateId, group.getId());
                continue;
            }

            User mentionedUser = userRepository.findById(candidateId).orElse(null);
            if (mentionedUser == null) {
                continue;
            }

            // Save ChatMessageMention
            ChatMessageMention mention = ChatMessageMention.builder()
                    .message(message)
                    .mentionedUser(mentionedUser)
                    .build();
            chatMessageMentionRepository.save(mention);
            if (message.getMentions() != null) {
                message.getMentions().add(mention);
            }

            // Create MENTION notification
            String previewText = textContent != null ? (textContent.length() > 100 ? textContent.substring(0, 97) + "..." : textContent) : "Shared media";
            String title = sender.getFullName() + " mentioned you in " + group.getName();
            notificationService.createChatNotification(
                    mentionedUser,
                    sender,
                    group,
                    message,
                    com.memoryverse.entity.NotificationType.MENTION,
                    title,
                    previewText
            );
            notifiedUserIds.add(candidateId);
        }

        // Process REPLY notification (if replyTo author is different and wasn't already notified by mention)
        if (replyTo != null && replyTo.getSender() != null) {
            User replyTargetUser = replyTo.getSender();
            if (!replyTargetUser.getId().equals(sender.getId()) && !notifiedUserIds.contains(replyTargetUser.getId())) {
                boolean isMember = chatGroupMemberRepository.existsByChatGroupIdAndUserId(group.getId(), replyTargetUser.getId());
                if (isMember) {
                    String previewText = textContent != null ? (textContent.length() > 100 ? textContent.substring(0, 97) + "..." : textContent) : "Shared media";
                    String title = sender.getFullName() + " replied to your message in " + group.getName();
                    notificationService.createChatNotification(
                            replyTargetUser,
                            sender,
                            group,
                            message,
                            com.memoryverse.entity.NotificationType.REPLY,
                            title,
                            previewText
                    );
                }
            }
        }
    }
}
