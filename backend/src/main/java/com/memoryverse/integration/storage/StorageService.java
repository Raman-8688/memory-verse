package com.memoryverse.integration.storage;

import com.memoryverse.dto.response.UploadedMediaResult;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {

    UploadedMediaResult uploadFile(MultipartFile file);
}
