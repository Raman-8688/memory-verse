package com.memoryverse.integration.storage;

import com.memoryverse.dto.response.UploadedMediaResult;
import com.memoryverse.entity.MediaType;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {

    UploadedMediaResult uploadFile(MultipartFile file);

    void deleteFile(String publicId, MediaType mediaType);
}
