package com.memoryverse.integration.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import com.memoryverse.dto.response.UploadedMediaResult;
import com.memoryverse.entity.MediaType;
import com.memoryverse.exception.BusinessValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryStorageService implements StorageService {

    private final Cloudinary cloudinary;

    @Value("${app.cloudinary.cloud-name:placeholder-cloud-name}")
    private String cloudName;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    @Value("${app.cloudinary.document-url-expiration-seconds:300}")
    private int documentUrlExpirationSeconds;

    public static final long MAX_IMAGE_SIZE_BYTES = 15L * 1024 * 1024;  // 15MB
    public static final long MAX_VIDEO_SIZE_BYTES = 50L * 1024 * 1024;  // 50MB
    public static final long MAX_FILE_SIZE_BYTES = 20L * 1024 * 1024;   // 20MB
    private static final String LOCAL_UPLOAD_DIR = "uploads/media";

    private static final Set<String> ALLOWED_VIDEO_MIMES = Set.of(
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "video/x-matroska"
    );

    private static final Set<String> ALLOWED_VIDEO_EXTENSIONS = Set.of(
            "mp4", "webm", "mov", "mkv"
    );

    private static final Set<String> DANGEROUS_EXTENSIONS = Set.of(
            "exe", "bat", "cmd", "sh", "apk", "jar", "dll", "msi", "vbs", "js", "jsp", "php", "bin", "com", "scr", "ps1"
    );

    private static final Set<String> ALLOWED_DOC_EXTENSIONS = Set.of(
            "pdf", "txt", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "json", "rtf", "md"
    );

    @Override
    public UploadedMediaResult uploadFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessValidationException("Cannot upload empty file");
        }

        String originalFilename = sanitizeFileName(file.getOriginalFilename());
        validateMagicBytes(file, originalFilename);
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        boolean isVideo = contentType.startsWith("video") || originalFilename.toLowerCase().endsWith(".mp4") || originalFilename.toLowerCase().endsWith(".webm");
        boolean isAudio = contentType.startsWith("audio") || originalFilename.toLowerCase().matches(".*\\.(mp3|wav|m4a|aac|ogg|weba)$");
        MediaType mediaType = isVideo ? MediaType.VIDEO : (isAudio ? MediaType.AUDIO : MediaType.IMAGE);

        if (isVideo) {
            return uploadVideo(file);
        }

        long startTime = System.currentTimeMillis();
        UploadedMediaResult result;

        if (isCloudinaryConfigured()) {
            try {
                result = uploadToCloudinary(file, mediaType, originalFilename);
            } catch (Exception ex) {
                log.warn("Cloudinary upload failed, falling back to local storage: {}", ex.getMessage());
                result = uploadToLocal(file, mediaType, originalFilename);
            }
        } else {
            result = uploadToLocal(file, mediaType, originalFilename);
        }

        long durationMs = System.currentTimeMillis() - startTime;
        log.info("Media upload completed: filename='{}', sizeBytes={}, mediaType={}, durationMs={}",
                originalFilename, file.getSize(), mediaType, durationMs);

        return result;
    }

    @Override
    public UploadedMediaResult uploadVideo(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessValidationException("Video file cannot be empty");
        }

        if (file.getSize() > MAX_VIDEO_SIZE_BYTES) {
            throw new BusinessValidationException("Video exceeds maximum allowed size of 50MB");
        }

        String originalFilename = sanitizeFileName(file.getOriginalFilename());
        validateMagicBytes(file, originalFilename);
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase().trim() : "";
        String extension = getFileExtension(originalFilename).toLowerCase();

        boolean validMime = ALLOWED_VIDEO_MIMES.contains(contentType);
        boolean validExt = ALLOWED_VIDEO_EXTENSIONS.contains(extension);

        if (!validMime && !validExt) {
            throw new BusinessValidationException("Invalid video format. Allowed video formats are: MP4, WebM, MOV");
        }

        long startTime = System.currentTimeMillis();
        UploadedMediaResult result;

        if (isCloudinaryConfigured()) {
            try {
                result = uploadVideoToCloudinary(file, originalFilename);
            } catch (Exception ex) {
                log.warn("Cloudinary video upload failed, falling back to local storage: {}", ex.getMessage());
                result = uploadToLocal(file, MediaType.VIDEO, originalFilename);
            }
        } else {
            result = uploadToLocal(file, MediaType.VIDEO, originalFilename);
        }

        long durationMs = System.currentTimeMillis() - startTime;
        log.info("Video upload completed: filename='{}', sizeBytes={}, durationMs={}", originalFilename, file.getSize(), durationMs);
        return result;
    }

    @Override
    public UploadedMediaResult uploadDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessValidationException("Document file cannot be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BusinessValidationException("File exceeds maximum allowed size of 20MB");
        }

        String originalFilename = sanitizeFileName(file.getOriginalFilename());
        validateMagicBytes(file, originalFilename);
        String extension = getFileExtension(originalFilename).toLowerCase();

        if (DANGEROUS_EXTENSIONS.contains(extension)) {
            throw new BusinessValidationException("Executable and script files (.exe, .bat, .sh, etc.) are strictly prohibited for security reasons");
        }

        if (!ALLOWED_DOC_EXTENSIONS.contains(extension)) {
            throw new BusinessValidationException("Unsupported document format. Allowed formats include: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV");
        }

        long startTime = System.currentTimeMillis();
        UploadedMediaResult result;

        if (isCloudinaryConfigured()) {
            try {
                result = uploadRawToCloudinary(file, originalFilename);
            } catch (Exception ex) {
                log.warn("Cloudinary document upload failed, falling back to local storage: {}", ex.getMessage());
                result = uploadToLocal(file, MediaType.IMAGE, originalFilename);
            }
        } else {
            result = uploadToLocal(file, MediaType.IMAGE, originalFilename);
        }

        long durationMs = System.currentTimeMillis() - startTime;
        log.info("Document upload completed: filename='{}', sizeBytes={}, durationMs={}", originalFilename, file.getSize(), durationMs);
        return result;
    }

    @SuppressWarnings("rawtypes")
    private UploadedMediaResult uploadToCloudinary(MultipartFile file, MediaType mediaType, String originalFilename) throws IOException {
        boolean isVideo = mediaType == MediaType.VIDEO;
        boolean isAudio = mediaType == MediaType.AUDIO;
        String folder = isVideo ? "memoryverse/videos" : (isAudio ? "memoryverse/audio" : "memoryverse/images");
        Map params = ObjectUtils.asMap(
                "folder", folder,
                "resource_type", (isVideo || isAudio) ? "video" : "image"
        );

        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), params);

        String publicId = (String) uploadResult.get("public_id");
        String secureUrl = (String) uploadResult.get("secure_url");
        Integer width = (Integer) uploadResult.get("width");
        Integer height = (Integer) uploadResult.get("height");
        Integer duration = uploadResult.get("duration") != null ? ((Number) uploadResult.get("duration")).intValue() : null;
        String format = (String) uploadResult.get("format");

        String thumbnailUrl;
        if (isVideo) {
            thumbnailUrl = cloudinary.url()
                    .resourceType("video")
                    .format("jpg")
                    .transformation(new Transformation<>().width(600).height(400).crop("fill"))
                    .generate(publicId);
        } else if (isAudio) {
            thumbnailUrl = null;
        } else {
            thumbnailUrl = cloudinary.url()
                    .transformation(new Transformation<>().width(600).height(600).crop("fill").fetchFormat("auto").quality("auto"))
                    .generate(publicId);
        }

        return UploadedMediaResult.builder()
                .mediaUrl(secureUrl)
                .thumbnailUrl(thumbnailUrl)
                .mediaType(mediaType)
                .publicId(publicId)
                .fileName(originalFilename)
                .fileSizeBytes(file.getSize())
                .width(isAudio ? null : width)
                .height(isAudio ? null : height)
                .durationSeconds(duration)
                .format(format)
                .build();
    }

    @SuppressWarnings("rawtypes")
    private UploadedMediaResult uploadVideoToCloudinary(MultipartFile file, String originalFilename) throws IOException {
        Map params = ObjectUtils.asMap(
                "folder", "memoryverse/groups/videos",
                "resource_type", "video"
        );

        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), params);

        String publicId = (String) uploadResult.get("public_id");
        String secureUrl = (String) uploadResult.get("secure_url");
        Integer width = (Integer) uploadResult.get("width");
        Integer height = (Integer) uploadResult.get("height");
        Integer duration = uploadResult.get("duration") != null ? ((Number) uploadResult.get("duration")).intValue() : null;
        String format = (String) uploadResult.get("format");

        String thumbnailUrl = cloudinary.url()
                .resourceType("video")
                .format("jpg")
                .transformation(new Transformation<>().width(640).height(360).crop("fill"))
                .generate(publicId);

        return UploadedMediaResult.builder()
                .mediaUrl(secureUrl)
                .thumbnailUrl(thumbnailUrl)
                .mediaType(MediaType.VIDEO)
                .publicId(publicId)
                .fileName(originalFilename)
                .fileSizeBytes(file.getSize())
                .width(width)
                .height(height)
                .durationSeconds(duration)
                .format(format != null ? format : "mp4")
                .build();
    }

    @SuppressWarnings("rawtypes")
    private UploadedMediaResult uploadRawToCloudinary(MultipartFile file, String originalFilename) throws IOException {
        Map params = ObjectUtils.asMap(
                "folder", "memoryverse/groups/documents",
                "resource_type", "raw",
                "use_filename", true,
                "unique_filename", true
        );

        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), params);

        String publicId = (String) uploadResult.get("public_id");
        String secureUrl = (String) uploadResult.get("secure_url");
        String format = getFileExtension(originalFilename);

        return UploadedMediaResult.builder()
                .mediaUrl(secureUrl)
                .thumbnailUrl(null)
                .mediaType(MediaType.IMAGE)
                .publicId(publicId)
                .fileName(originalFilename)
                .fileSizeBytes(file.getSize())
                .width(null)
                .height(null)
                .durationSeconds(null)
                .format(format)
                .build();
    }

    private UploadedMediaResult uploadToLocal(MultipartFile file, MediaType mediaType, String originalFilename) {
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

            String baseUrl = (publicBaseUrl != null && !publicBaseUrl.isBlank())
                    ? publicBaseUrl.replaceAll("/+$", "")
                    : "http://localhost:8080";
            String localUrl = baseUrl + "/api/media/files/" + storedFileName;
            boolean isVideo = mediaType == MediaType.VIDEO;
            boolean isAudio = mediaType == MediaType.AUDIO;

            Integer width = null;
            Integer height = null;
            Integer duration = null;

            if (isVideo) {
                width = 1280;
                height = 720;
                duration = 15;
            } else if (isAudio) {
                width = null;
                height = null;
                duration = 60;
            } else {
                width = 800;
                height = 600;
                duration = null;
            }

            return UploadedMediaResult.builder()
                    .mediaUrl(localUrl)
                    .thumbnailUrl(isAudio ? null : localUrl)
                    .mediaType(mediaType)
                    .publicId("local_" + storedFileName)
                    .fileName(originalFilename)
                    .fileSizeBytes(file.getSize())
                    .width(width)
                    .height(height)
                    .durationSeconds(duration)
                    .format(fileExtension.replace(".", ""))
                    .build();
        } catch (IOException e) {
            log.error("Failed to store file locally", e);
            throw new BusinessValidationException("Failed to upload and store media file");
        }
    }

    @Override
    @SuppressWarnings("rawtypes")
    public void deleteFile(String publicId, MediaType mediaType) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }

        try {
            if (publicId.startsWith("local_")) {
                String storedFileName = publicId.substring("local_".length());
                Path filePath = Paths.get(LOCAL_UPLOAD_DIR).resolve(storedFileName);
                if (Files.exists(filePath)) {
                    Files.delete(filePath);
                    log.info("Deleted local file: {}", filePath);
                }
                return;
            }

            if (isCloudinaryConfigured()) {
                boolean isVideoOrAudio = mediaType == MediaType.VIDEO || mediaType == MediaType.AUDIO;
                Map params = ObjectUtils.asMap(
                        "resource_type", isVideoOrAudio ? "video" : "image"
                );
                Map result = cloudinary.uploader().destroy(publicId, params);
                log.info("Destroyed Cloudinary asset: publicId='{}', result={}", publicId, result);
            }
        } catch (Exception ex) {
            log.warn("Failed to delete asset with publicId='{}': {}", publicId, ex.getMessage());
        }
    }

    @Override
    @SuppressWarnings("rawtypes")
    public void deleteResource(String publicId, String resourceType) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }

        try {
            if (publicId.startsWith("local_")) {
                String storedFileName = publicId.substring("local_".length());
                Path filePath = Paths.get(LOCAL_UPLOAD_DIR).resolve(storedFileName);
                if (Files.exists(filePath)) {
                    Files.delete(filePath);
                    log.info("Deleted local file: {}", filePath);
                }
                return;
            }

            if (isCloudinaryConfigured()) {
                String resType = (resourceType != null && !resourceType.isBlank()) ? resourceType : "image";
                Map params = ObjectUtils.asMap(
                        "resource_type", resType
                );
                Map result = cloudinary.uploader().destroy(publicId, params);
                log.info("Destroyed Cloudinary resource: publicId='{}', type='{}', result={}", publicId, resType, result);
            }
        } catch (Exception ex) {
            log.warn("Failed to delete resource with publicId='{}': {}", publicId, ex.getMessage());
        }
    }

    @Override
    @SuppressWarnings("rawtypes")
    public String generateSignedDocumentUrl(String publicId, String format, int expirationSeconds) {
        if (publicId == null || publicId.isBlank()) {
            return null;
        }

        if (publicId.startsWith("local_")) {
            String storedFileName = publicId.substring("local_".length());
            String baseUrl = (publicBaseUrl != null && !publicBaseUrl.isBlank())
                    ? publicBaseUrl.replaceAll("/+$", "")
                    : "http://localhost:8080";
            return baseUrl + "/api/media/files/" + storedFileName;
        }

        if (isCloudinaryConfigured()) {
            try {
                com.cloudinary.Url urlBuilder = cloudinary.url().resourceType("raw").signed(true);
                if (format != null && !format.isBlank()) {
                    urlBuilder.format(format);
                }
                return urlBuilder.generate(publicId);
            } catch (Exception ex) {
                log.error("Failed to generate Cloudinary signed document URL for publicId [{}]: {}", publicId, ex.getMessage());
                throw new BusinessValidationException("Failed to generate secure document download link");
            }
        }

        return null;
    }

    private void validateMagicBytes(MultipartFile file, String filename) {
        try {
            byte[] header = new byte[8];
            int read = file.getInputStream().read(header);
            if (read >= 2) {
                // DOS MZ executable signature: 'M', 'Z' (0x4D, 0x5A)
                if (header[0] == 0x4D && header[1] == 0x5A) {
                    throw new BusinessValidationException("Executable binary files (MZ / PE) are strictly prohibited for security reasons");
                }
            }
            if (read >= 4) {
                // ELF binary signature: 0x7F, 'E', 'L', 'F' (0x7F, 0x45, 0x4C, 0x46)
                if (header[0] == 0x7F && header[1] == 0x45 && header[2] == 0x4C && header[3] == 0x46) {
                    throw new BusinessValidationException("Executable ELF binary files are strictly prohibited for security reasons");
                }
                // Java class binary signature: 0xCA, 0xFE, 0xBA, 0xBE
                if ((header[0] & 0xFF) == 0xCA && (header[1] & 0xFF) == 0xFE && (header[2] & 0xFF) == 0xBA && (header[3] & 0xFF) == 0xBE) {
                    throw new BusinessValidationException("Compiled Java class binaries are strictly prohibited for security reasons");
                }
            }
        } catch (BusinessValidationException bve) {
            throw bve;
        } catch (Exception ex) {
            log.debug("Magic bytes validation skipped for file [{}]: {}", filename, ex.getMessage());
        }
    }

    private boolean isCloudinaryConfigured() {
        return cloudName != null && !cloudName.equals("placeholder-cloud-name") && !cloudName.isBlank();
    }

    public static String sanitizeFileName(String rawFilename) {
        if (rawFilename == null || rawFilename.isBlank()) {
            return "attachment";
        }
        // Remove directory paths (both forward and backward slashes)
        String cleaned = Paths.get(rawFilename).getFileName().toString();
        // Remove null bytes and control chars
        cleaned = cleaned.replaceAll("[\\p{Cntrl}\\0]", "");
        // Limit length to 255 chars
        if (cleaned.length() > 255) {
            cleaned = cleaned.substring(cleaned.length() - 255);
        }
        return cleaned.isBlank() ? "attachment" : cleaned;
    }

    private String getFileExtension(String filename) {
        if (filename == null) return "";
        int dotIndex = filename.lastIndexOf('.');
        return (dotIndex >= 0 && dotIndex < filename.length() - 1) ? filename.substring(dotIndex + 1) : "";
    }
}
