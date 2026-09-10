package com.memoryverse.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignedDocumentUrlResponseDto {
    private UUID messageId;
    private String url;
    private String fileName;
    private Instant expiresAt;
}
