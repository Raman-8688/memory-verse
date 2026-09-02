package com.memoryverse.controller;

import com.memoryverse.dto.request.LoginRequest;
import com.memoryverse.dto.request.RegisterRequest;
import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.AuthResponseDto;
import com.memoryverse.dto.response.UserDto;
import com.memoryverse.security.SecurityUtils;
import com.memoryverse.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponseDto>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponseDto response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponseDto>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponseDto response = authService.register(request);
        return new ResponseEntity<>(ApiResponse.success("Account created successfully", response), HttpStatus.CREATED);
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        UserDto user = authService.getCurrentUser(currentUserId);
        return ResponseEntity.ok(ApiResponse.success(user));
    }
}
