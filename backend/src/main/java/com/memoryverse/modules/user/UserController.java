package com.memoryverse.modules.user;

import com.memoryverse.common.api.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        List<UserDto> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UserUpdateRequest request) {
        UserDto updated = userService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.success("User updated successfully", updated));
    }

    @PostMapping("/{id}/avatar")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MEMBER')")
    public ResponseEntity<ApiResponse<UserDto>> uploadAvatar(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        UUID currentUserId = com.memoryverse.common.util.SecurityUtils.getCurrentUserId();
        if (!currentUserId.equals(id) && !com.memoryverse.common.util.SecurityUtils.hasRole("ADMIN")) {
            throw new com.memoryverse.common.exception.ForbiddenException("You do not have permission to update this avatar");
        }
        UserDto updated = userService.updateUserAvatar(id, file);
        return ResponseEntity.ok(ApiResponse.success("Avatar uploaded successfully", updated));
    }
}
