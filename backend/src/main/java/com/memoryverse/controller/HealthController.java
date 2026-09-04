package com.memoryverse.controller;

import com.memoryverse.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
@Slf4j
public class HealthController {

    private final DataSource dataSource;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("status", "UP");
        details.put("application", "MemoryVerse API");
        details.put("timestamp", Instant.now().toString());

        boolean dbConnected = false;
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            dbConnected = stmt.execute("SELECT 1");
        } catch (Exception e) {
            log.warn("Health check DB ping failed: {}", e.getMessage());
        }

        details.put("database", dbConnected ? "CONNECTED" : "DISCONNECTED");

        return ResponseEntity.ok(ApiResponse.success(details));
    }
}
