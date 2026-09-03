package com.memoryverse.service.impl;

import com.memoryverse.dto.response.MediaResponseDto;
import com.memoryverse.dto.response.UploadedMediaResult;
import com.memoryverse.entity.Media;
import com.memoryverse.entity.MediaType;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.integration.storage.StorageService;
import com.memoryverse.repository.MediaRepository;
import com.memoryverse.service.MediaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaServiceImpl implements MediaService {

    private final StorageService storageService;
    private final MediaRepository mediaRepository;

    @Override
    public List<Media> uploadMediaFiles(List<MultipartFile> files) {
        List<Media> mediaList = new ArrayList<>();
        if (files == null || files.isEmpty()) {
            return mediaList;
        }

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
            MediaType mediaType = resolveMediaType(file.getContentType(), originalFilename);

            log.info("Uploading file '{}' detected as {}", originalFilename, mediaType);
            UploadedMediaResult uploadResult = storageService.uploadFile(file);

            Media media = Media.builder()
                    .mediaUrl(uploadResult.getMediaUrl())
                    .thumbnailUrl(uploadResult.getThumbnailUrl())
                    .publicId(uploadResult.getPublicId())
                    .fileName(originalFilename)
                    .fileSizeBytes(file.getSize())
                    .mediaType(mediaType != null ? mediaType : uploadResult.getMediaType())
                    .width(uploadResult.getWidth())
                    .height(uploadResult.getHeight())
                    .durationSeconds(uploadResult.getDurationSeconds())
                    .displayOrder(i)
                    .build();

            mediaList.add(media);
        }

        return mediaList;
    }

    @Override
    public MediaResponseDto uploadSingleFile(MultipartFile file) {
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        MediaType mediaType = resolveMediaType(file.getContentType(), originalFilename);

        log.info("Uploading single file '{}' as {}", originalFilename, mediaType);
        UploadedMediaResult uploadResult = storageService.uploadFile(file);

        Media media = Media.builder()
                .mediaUrl(uploadResult.getMediaUrl())
                .thumbnailUrl(uploadResult.getThumbnailUrl())
                .publicId(uploadResult.getPublicId())
                .fileName(originalFilename)
                .fileSizeBytes(file.getSize())
                .mediaType(mediaType != null ? mediaType : uploadResult.getMediaType())
                .width(uploadResult.getWidth())
                .height(uploadResult.getHeight())
                .durationSeconds(uploadResult.getDurationSeconds())
                .displayOrder(0)
                .build();

        return MediaResponseDto.fromEntity(media);
    }

    @Override
    @Transactional
    public MediaResponseDto updateTranscript(UUID mediaId, String transcript) {
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new ResourceNotFoundException("Media not found with id: " + mediaId));

        media.setTranscript(transcript);
        Media saved = mediaRepository.save(media);
        log.info("Updated transcript for media id={}", mediaId);
        return MediaResponseDto.fromEntity(saved);
    }

    private MediaType resolveMediaType(String contentType, String fileName) {
        String lowerName = fileName.toLowerCase();
        if (contentType != null) {
            String lowerContent = contentType.toLowerCase();
            if (lowerContent.startsWith("video/")) {
                return MediaType.VIDEO;
            }
            if (lowerContent.startsWith("audio/") || lowerContent.contains("audio")) {
                return MediaType.AUDIO;
            }
        }
        if (lowerName.endsWith(".mp4") || lowerName.endsWith(".mov") || lowerName.endsWith(".avi")
                || lowerName.endsWith(".mkv") || lowerName.endsWith(".webm")) {
            return MediaType.VIDEO;
        }
        if (lowerName.endsWith(".mp3") || lowerName.endsWith(".wav") || lowerName.endsWith(".m4a")
                || lowerName.endsWith(".aac") || lowerName.endsWith(".ogg")) {
            return MediaType.AUDIO;
        }
        return MediaType.IMAGE;
    }
}
