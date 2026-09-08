package com.memoryverse.service;

import com.memoryverse.dto.response.MomentDto;
import com.memoryverse.dto.response.PagedResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface MomentService {

    MomentDto createMoment(List<MultipartFile> files, String caption, UUID currentUserId);

    PagedResponse<MomentDto> listMoments(UUID authorId, int page, int size);

    MomentDto updateCaption(UUID id, String caption, UUID currentUserId);

    void deleteMoment(UUID id, UUID currentUserId);
}
