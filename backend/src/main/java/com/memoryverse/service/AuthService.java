package com.memoryverse.service;

import com.memoryverse.dto.request.LoginRequest;
import com.memoryverse.dto.request.RegisterRequest;
import com.memoryverse.dto.response.AuthResponseDto;
import com.memoryverse.dto.response.UserDto;

import java.util.UUID;

public interface AuthService {

    AuthResponseDto login(LoginRequest request);

    AuthResponseDto register(RegisterRequest request);

    UserDto getCurrentUser(UUID userId);
}
