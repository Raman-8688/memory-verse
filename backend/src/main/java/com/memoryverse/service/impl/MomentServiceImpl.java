package com.memoryverse.service.impl;

import com.memoryverse.dto.response.MomentDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.dto.response.UploadedMediaResult;
import com.memoryverse.entity.Moment;
import com.memoryverse.entity.MomentMedia;
import com.memoryverse.entity.User;
import com.memoryverse.exception.BusinessValidationException;
import com.memoryverse.exception.ForbiddenException;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.integration.storage.StorageService;
import com.memoryverse.repository.MomentRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.MomentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MomentServiceImpl implements MomentService {

    private final MomentRepository momentRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;

    @Override
    @Transactional
    public MomentDto createMoment(List<MultipartFile> files, String caption, UUID currentUserId) {
        if (files == null || files.isEmpty()) {
            throw new BusinessValidationException("At least one media file is required to create a moment");
        }

        User author = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUserId));

        Moment moment = Moment.builder()
                .author(author)
                .caption(caption != null && !caption.isBlank() ? caption.trim() : null)
                .build();

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            if (file.isEmpty()) {
                continue;
            }

            UploadedMediaResult uploaded = storageService.uploadFile(file);

            MomentMedia media = MomentMedia.builder()
                    .moment(moment)
                    .mediaUrl(uploaded.getMediaUrl())
                    .thumbnailUrl(uploaded.getThumbnailUrl())
                    .mediaType(uploaded.getMediaType())
                    .displayOrder(i)
                    .build();

            moment.addMedia(media);
        }

        if (moment.getMediaList().isEmpty()) {
            throw new BusinessValidationException("No valid media files were provided for upload");
        }

        Moment saved = momentRepository.save(moment);
        log.info("Created new Moment [{}] by user [{}] with {} media attachments", 
                saved.getId(), author.getId(), saved.getMediaList().size());

        return MomentDto.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<MomentDto> listMoments(UUID authorId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 50);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Moment> momentPage;
        if (authorId != null) {
            momentPage = momentRepository.findAllByAuthorIdOrderByCreatedAtDesc(authorId, pageable);
        } else {
            momentPage = momentRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        Page<MomentDto> dtoPage = momentPage.map(MomentDto::fromEntity);
        return PagedResponse.fromPage(dtoPage);
    }

    @Override
    @Transactional
    public MomentDto updateCaption(UUID id, String caption, UUID currentUserId) {
        Moment moment = momentRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Moment not found with id: " + id));

        boolean isAuthor = moment.getAuthor().getId().equals(currentUserId);
        boolean isAdmin = SecurityUtils.hasRole("ADMIN");

        if (!isAuthor && !isAdmin) {
            throw new ForbiddenException("Only the moment author or an administrator can update the caption");
        }

        moment.setCaption(caption != null && !caption.isBlank() ? caption.trim() : null);
        Moment saved = momentRepository.save(moment);
        log.info("Updated caption for Moment [{}] by user [{}]", id, currentUserId);

        return MomentDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public void deleteMoment(UUID id, UUID currentUserId) {
        Moment moment = momentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Moment not found with id: " + id));

        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        if (!isAdmin) {
            throw new ForbiddenException("Only administrators can delete moments");
        }

        momentRepository.delete(moment);
        log.info("Deleted Moment [{}] by admin [{}]", id, currentUserId);
    }
}
