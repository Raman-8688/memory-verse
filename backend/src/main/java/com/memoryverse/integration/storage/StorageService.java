package com.memoryverse.integration.storage;

import com.memoryverse.dto.response.UploadedMediaResult;
import com.memoryverse.entity.MediaType;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {

    UploadedMediaResult uploadFile(MultipartFile file);

    UploadedMediaResult uploadVideo(MultipartFile file);

    UploadedMediaResult uploadDocument(MultipartFile file);

    void deleteFile(String publicId, MediaType mediaType);

    void deleteResource(String publicId, String resourceType);

    String generateSignedDocumentUrl(String publicId, String format, int expirationSeconds);
}
