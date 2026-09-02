package com.memoryverse.service.impl;

import com.memoryverse.dto.request.LoginRequest;
import com.memoryverse.dto.request.RegisterRequest;
import com.memoryverse.dto.response.AuthResponseDto;
import com.memoryverse.dto.response.UserDto;
import com.memoryverse.entity.Role;
import com.memoryverse.entity.User;
import com.memoryverse.exception.BusinessValidationException;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.security.JwtTokenProvider;
import com.memoryverse.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationInMs;

    @Override
    @Transactional(readOnly = true)
    public AuthResponseDto login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        log.info("User logged in successfully: {}", user.getEmail());
        return AuthResponseDto.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtExpirationInMs / 1000)
                .user(UserDto.fromEntity(user))
                .build();
    }

    @Override
    @Transactional
    public AuthResponseDto register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BusinessValidationException("An account with this email address already exists");
        }

        User user = User.builder()
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .avatarUrl(request.getAvatarUrl())
                .role(Role.MEMBER)
                .build();

        User savedUser = userRepository.save(user);

        String token = tokenProvider.generateToken(savedUser.getId(), savedUser.getEmail(), savedUser.getRole().name());

        log.info("New user registered successfully: {}", savedUser.getEmail());
        return AuthResponseDto.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtExpirationInMs / 1000)
                .user(UserDto.fromEntity(savedUser))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        return UserDto.fromEntity(user);
    }
}
