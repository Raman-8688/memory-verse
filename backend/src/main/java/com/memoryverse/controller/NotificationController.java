package com.memoryverse.controller;

import com.memoryverse.dto.request.PageRequestDto;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.NotificationResponseDto;
import com.memoryverse.dto.response.PagedResponse;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<NotificationResponseDto>>> getNotifications(
            @Valid PageRequestDto pageRequest) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        PagedResponse<NotificationResponseDto> response = notificationService.getNotifications(
                currentUserId, pageRequest.toPageable());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        long count = notificationService.getUnreadCount(currentUserId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable UUID id) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        notificationService.markAsRead(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        notificationService.markAllAsRead(currentUserId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
