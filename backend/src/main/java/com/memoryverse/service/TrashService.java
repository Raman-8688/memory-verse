package com.memoryverse.service;

import com.memoryverse.dto.response.TrashItemDto;

import java.util.List;
import java.util.UUID;

public interface TrashService {

    List<TrashItemDto> getTrashItems(UUID userId);

    void restoreMemory(UUID memoryId, UUID userId);

    void restoreJourney(UUID journeyId, UUID userId);

    void hardDeleteMemory(UUID memoryId, UUID userId);

    void hardDeleteJourney(UUID journeyId, UUID userId);

    void emptyTrash(UUID userId);
}
