package com.memoryverse.modules.media;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import com.memoryverse.common.exception.BusinessValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryStorageService {

    private final Cloudinary cloudinary;

    @Value("${app.cloudinary.cloud-name:placeholder-cloud-name}")
    private String cloudName;

    private static final long MAX_VIDEO_SIZE_BYTES = 50L * 1024 * 1024; // 50MB
    private static final String LOCAL_UPLOAD_DIR = "uploads/media";

    public UploadedMediaResult uploadFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BusinessValidationException("Cannot upload empty file");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "media";
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        boolean isVideo = contentType.startsWith("video") || originalFilename.toLowerCase().endsWith(".mp4");

        if (isVideo) {
            // Constraint check: Max 50MB and MP4 format only
            if (file.getSize() > MAX_VIDEO_SIZE_BYTES) {
                throw new BusinessValidationException("Video exceeds maximum allowed size of 50MB");
            }
            if (!contentType.contains("mp4") && !originalFilename.toLowerCase().endsWith(".mp4")) {
                throw new BusinessValidationException("Only MP4 video format is supported for uploads");
            }
        }

        // Check if Cloudinary credentials are valid or placeholder
        if (cloudName != null && !cloudName.equals("placeholder-cloud-name") && !cloudName.isBlank()) {
            try {
                return uploadToCloudinary(file, isVideo, originalFilename);
            } catch (Exception ex) {
                log.warn("Cloudinary upload failed, falling back to local storage: {}", ex.getMessage());
            }
        }

        // Local storage fallback
        return uploadToLocal(file, isVideo, originalFilename);
    }

    @SuppressWarnings("rawtypes")
    private UploadedMediaResult uploadToCloudinary(MultipartFile file, boolean isVideo, String originalFilename) throws IOException {
        String folder = isVideo ? "memoryverse/videos" : "memoryverse/images";
        Map params = ObjectUtils.asMap(
                "folder", folder,
                "resource_type", isVideo ? "video" : "image"
        );

        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), params);

        String publicId = (String) uploadResult.get("public_id");
        String secureUrl = (String) uploadResult.get("secure_url");
        Integer width = (Integer) uploadResult.get("width");
        Integer height = (Integer) uploadResult.get("height");
        Integer duration = uploadResult.get("duration") != null ? ((Number) uploadResult.get("duration")).intValue() : null;

        String thumbnailUrl;
        if (isVideo) {
            // Cloudinary video thumbnail: poster frame as .jpg with auto quality
            thumbnailUrl = cloudinary.url()
                    .resourceType("video")
                    .format("jpg")
                    .transformation(new Transformation<>().width(600).height(400).crop("fill"))
                    .generate(publicId);
        } else {
            // Cloudinary image thumbnail: 600x600 auto crop, auto format and quality
            thumbnailUrl = cloudinary.url()
                    .transformation(new Transformation<>().width(600).height(600).crop("fill").fetchFormat("auto").quality("auto"))
                    .generate(publicId);
        }

        return UploadedMediaResult.builder()
                .mediaUrl(secureUrl)
                .thumbnailUrl(thumbnailUrl)
                .mediaType(isVideo ? MediaType.VIDEO : MediaType.IMAGE)
                .publicId(publicId)
                .fileName(originalFilename)
                .fileSizeBytes(file.getSize())
                .width(width)
                .height(height)
                .durationSeconds(duration)
                .build();
    }

    private UploadedMediaResult uploadToLocal(MultipartFile file, boolean isVideo, String originalFilename) {
        try {
            Path uploadPath = Paths.get(LOCAL_UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String fileExtension = "";
            int dotIndex = originalFilename.lastIndexOf('.');
            if (dotIndex > 0) {
                fileExtension = originalFilename.substring(dotIndex);
            }

            String storedFileName = UUID.randomUUID().toString() + fileExtension;
            Path destination = uploadPath.resolve(storedFileName);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            String localUrl = "/api/media/files/" + storedFileName;

            return UploadedMediaResult.builder()
                    .mediaUrl(localUrl)
                    .thumbnailUrl(localUrl)
                    .mediaType(isVideo ? MediaType.VIDEO : MediaType.IMAGE)
                    .publicId("local_" + storedFileName)
                    .fileName(originalFilename)
                    .fileSizeBytes(file.getSize())
                    .width(isVideo ? 1280 : 800)
                    .height(isVideo ? 720 : 600)
                    .durationSeconds(isVideo ? 15 : null)
                    .build();
        } catch (IOException e) {
            log.error("Failed to store file locally", e);
            throw new BusinessValidationException("Failed to upload and store media file");
        }
    }
}
