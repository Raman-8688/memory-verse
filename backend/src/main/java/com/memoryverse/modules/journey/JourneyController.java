package com.memoryverse.modules.journey;

import com.memoryverse.common.api.ApiResponse;
import com.memoryverse.common.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/journeys")
@RequiredArgsConstructor
public class JourneyController {

    private final JourneyService journeyService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<JourneyResponseDto>>> getAllJourneys() {
        List<JourneyResponseDto> journeys = journeyService.getAllJourneys();
        return ResponseEntity.ok(ApiResponse.success(journeys));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JourneyResponseDto>> getJourneyById(@PathVariable UUID id) {
        JourneyResponseDto journey = journeyService.getJourneyById(id);
        return ResponseEntity.ok(ApiResponse.success(journey));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MEMBER')")
    public ResponseEntity<ApiResponse<JourneyResponseDto>> createJourney(
            @Valid @RequestBody JourneyCreateDto dto) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        JourneyResponseDto created = journeyService.createJourney(dto, currentUserId);
        return new ResponseEntity<>(ApiResponse.success("Journey created successfully", created), HttpStatus.CREATED);
    }

    @PostMapping("/{id}/sections")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MEMBER')")
    public ResponseEntity<ApiResponse<JourneySectionResponseDto>> addSection(
            @PathVariable UUID id,
            @Valid @RequestBody JourneySectionCreateDto dto) {
        JourneySectionResponseDto section = journeyService.addSection(id, dto);
        return new ResponseEntity<>(ApiResponse.success("Section added successfully", section), HttpStatus.CREATED);
    }
}
