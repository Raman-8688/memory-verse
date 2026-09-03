package com.memoryverse.controller;

import com.memoryverse.dto.request.TranscriptUpdateDto;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.MediaResponseDto;
import com.memoryverse.service.MediaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.HandlerMapping;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;

    private static final List<String> UPLOAD_SEARCH_PATHS = List.of(
            "uploads/media",
            "backend/uploads/media",
            "../uploads/media",
            "../backend/uploads/media"
    );

    private static final List<String> RAW_DATA_SEARCH_PATHS = List.of(
            "raw_data",
            "backend/raw_data",
            "../raw_data",
            "../backend/raw_data"
    );

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<MediaResponseDto>> uploadMedia(
            @RequestParam("file") MultipartFile file) {
        MediaResponseDto response = mediaService.uploadSingleFile(file);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}/transcript")
    public ResponseEntity<ApiResponse<MediaResponseDto>> updateTranscript(
            @PathVariable UUID id,
            @Valid @RequestBody TranscriptUpdateDto request) {
        MediaResponseDto response = mediaService.updateTranscript(id, request.getTranscript());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/files/{fileName:.+}")
    public ResponseEntity<Resource> serveUploadedFile(@PathVariable String fileName) {
        for (String basePath : UPLOAD_SEARCH_PATHS) {
            try {
                Path filePath = Paths.get(basePath, fileName).normalize();
                if (Files.exists(filePath) && Files.isReadable(filePath) && !Files.isDirectory(filePath)) {
                    Resource resource = new UrlResource(filePath.toUri());
                    String contentType = Files.probeContentType(filePath);
                    if (contentType == null) {
                        contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
                    }
                    return ResponseEntity.ok()
                            .contentType(MediaType.parseMediaType(contentType))
                            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                            .body(resource);
                }
            } catch (IOException e) {
                log.warn("Error reading local uploaded file {}: {}", fileName, e.getMessage());
            }
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    @GetMapping("/raw/**")
    public ResponseEntity<Resource> serveRawDataFile(HttpServletRequest request) {
        String fullPath = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String subPath = fullPath.replaceFirst("^/media/raw/?", "").replaceFirst("^/api/media/raw/?", "");

        for (String basePath : RAW_DATA_SEARCH_PATHS) {
            try {
                Path filePath = Paths.get(basePath, subPath).normalize();
                if (Files.exists(filePath) && Files.isReadable(filePath) && !Files.isDirectory(filePath)) {
                    Resource resource = new UrlResource(filePath.toUri());
                    String contentType = Files.probeContentType(filePath);
                    if (contentType == null) {
                        contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
                    }
                    return ResponseEntity.ok()
                            .contentType(MediaType.parseMediaType(contentType))
                            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                            .body(resource);
                }
            } catch (IOException e) {
                log.warn("Error reading raw data file {}: {}", subPath, e.getMessage());
            }
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
}

