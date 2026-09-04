package com.memoryverse.controller;

import com.memoryverse.dto.request.UserCreateRequest;
import com.memoryverse.dto.request.UserUpdateRequest;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.UserDto;
import com.memoryverse.exception.ForbiddenException;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDto>> createUser(@Valid @RequestBody UserCreateRequest request) {
        UserDto created = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User created successfully", created));
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
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        if (!currentUserId.equals(id) && !SecurityUtils.hasRole("ADMIN")) {
            throw new ForbiddenException("You do not have permission to update this avatar");
        }
        UserDto updated = userService.updateUserAvatar(id, file);
        return ResponseEntity.ok(ApiResponse.success("Avatar uploaded successfully", updated));
    }
}
