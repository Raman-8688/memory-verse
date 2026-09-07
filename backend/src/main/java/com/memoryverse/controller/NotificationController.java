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
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUnreadCount() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        long count = notificationService.getUnreadCount(currentUserId);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "unreadCount", count,
                "count", count
        )));
    }

    @RequestMapping(value = {"/{id}/read", "/{id}/mark-read"}, method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable UUID id) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        notificationService.markAsRead(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @RequestMapping(value = {"/mark-all-read", "/read-all"}, method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        notificationService.markAllAsRead(currentUserId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/check-on-this-day")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerOnThisDayCheck() {
        int count = notificationService.checkAndGenerateOnThisDayNotifications();
        return ResponseEntity.ok(ApiResponse.success(Map.of("notificationsSent", count)));
    }
}
