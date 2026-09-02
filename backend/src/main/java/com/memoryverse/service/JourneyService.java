package com.memoryverse.service;

import com.memoryverse.dto.request.JourneyCreateDto;
import com.memoryverse.dto.request.JourneySectionCreateDto;
import com.memoryverse.dto.request.JourneySectionUpdateDto;
import com.memoryverse.dto.request.JourneyUpdateDto;
import com.memoryverse.dto.response.JourneyResponseDto;
import com.memoryverse.dto.response.JourneySectionResponseDto;

import java.util.List;
import java.util.UUID;

public interface JourneyService {

    List<JourneyResponseDto> getAllJourneys();

    JourneyResponseDto getJourneyById(UUID id);

    JourneyResponseDto createJourney(JourneyCreateDto dto, UUID creatorId);

    JourneySectionResponseDto addSection(UUID journeyId, JourneySectionCreateDto dto);

    JourneySectionResponseDto updateSection(UUID journeyId, UUID sectionId, JourneySectionUpdateDto dto, UUID currentUserId);

    JourneyResponseDto updateJourney(UUID journeyId, JourneyUpdateDto dto, UUID currentUserId);
}
