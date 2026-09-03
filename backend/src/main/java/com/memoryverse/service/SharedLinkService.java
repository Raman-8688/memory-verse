package com.memoryverse.service;

import com.memoryverse.dto.request.CreateSharedLinkRequestDto;
import com.memoryverse.dto.response.PublicSharedPayloadDto;
import com.memoryverse.dto.response.SharedLinkResponseDto;

import java.util.UUID;

public interface SharedLinkService {

    SharedLinkResponseDto createOrGetSharedLink(CreateSharedLinkRequestDto request, UUID currentUserId);

    PublicSharedPayloadDto getPublicPayload(String token);

    void revokeSharedLink(UUID linkId, UUID currentUserId);
}
