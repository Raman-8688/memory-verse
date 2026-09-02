package com.memoryverse.controller;

import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.DashboardResponseDto;
import com.memoryverse.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardResponseDto>> getDashboard() {
        DashboardResponseDto data = dashboardService.getDashboardData();
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
