package com.memoryverse.service;

import com.memoryverse.dto.response.MediaResponseDto;
import com.memoryverse.entity.Media;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface MediaService {

    List<Media> uploadMediaFiles(List<MultipartFile> files);

    MediaResponseDto uploadSingleFile(MultipartFile file);

    MediaResponseDto updateTranscript(UUID mediaId, String transcript);
}
