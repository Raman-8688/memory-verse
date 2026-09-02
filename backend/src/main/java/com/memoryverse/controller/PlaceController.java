package com.memoryverse.controller;

import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.PlaceSummaryDto;
import com.memoryverse.service.MemoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/places")
@RequiredArgsConstructor
public class PlaceController {

    private final MemoryService memoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlaceSummaryDto>>> getAllPlaces() {
        return ResponseEntity.ok(ApiResponse.success(memoryService.getPlacesSummary()));
    }
}
