package com.memoryverse.modules.media;

import com.memoryverse.common.api.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/media")
@RequiredArgsConstructor
public class MediaController {

    private final CloudinaryStorageService cloudinaryStorageService;

    private static final String LOCAL_UPLOAD_DIR = "uploads/media";

    @PostMapping(value = "/upload", consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<ApiResponse<UploadedMediaResult>> uploadSingleFile(
            @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Upload file cannot be empty");
        }
        UploadedMediaResult result = cloudinaryStorageService.uploadFile(file);
        return ResponseEntity.ok(ApiResponse.success("File uploaded successfully", result));
    }

    @GetMapping("/files/{fileName:.+}")
    public ResponseEntity<Resource> getLocalFile(@PathVariable String fileName) {
        try {
            Path filePath = Paths.get(LOCAL_UPLOAD_DIR).resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                String contentType = fileName.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CACHE_CONTROL, "max-age=86400")
                        .body(resource);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/raw/**")
    public ResponseEntity<Resource> getRawDataFile(jakarta.servlet.http.HttpServletRequest request) {
        try {
            String path = request.getRequestURI();
            int idx = path.indexOf("/raw/");
            if (idx == -1) {
                return ResponseEntity.notFound().build();
            }

            String subPath = java.net.URLDecoder.decode(path.substring(idx + 5), java.nio.charset.StandardCharsets.UTF_8);
            Path filePath = Paths.get("raw_data").resolve(subPath).normalize();
            if (!java.nio.file.Files.exists(filePath)) {
                filePath = Paths.get("../raw_data").resolve(subPath).normalize();
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                String lower = subPath.toLowerCase();
                String contentType = lower.endsWith(".mp4") ? "video/mp4"
                        : (lower.endsWith(".png") ? "image/png" : "image/jpeg");

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CACHE_CONTROL, "max-age=86400")
                        .body(resource);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
