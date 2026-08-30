package com.memoryverse.modules.media;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadedMediaResult {
    private String mediaUrl;
    private String thumbnailUrl;
    private MediaType mediaType;
    private String publicId;
    private String fileName;
    private Long fileSizeBytes;
    private Integer width;
    private Integer height;
    private Integer durationSeconds;
}
