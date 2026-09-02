package com.memoryverse.service.impl;

import com.memoryverse.dto.request.UserUpdateRequest;
import com.memoryverse.dto.response.UploadedMediaResult;
import com.memoryverse.dto.response.UserDto;
import com.memoryverse.entity.User;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.integration.storage.CloudinaryStorageService;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final CloudinaryStorageService cloudinaryStorageService;

    @Override
    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserDto updateUser(UUID id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        log.info("Admin updating user {}: name='{}', role={}", id, request.getFullName(), request.getRole());

        user.setFullName(request.getFullName());
        user.setRole(request.getRole());
        if (request.getAvatarUrl() != null && !request.getAvatarUrl().isBlank()) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        User updatedUser = userRepository.save(user);
        return UserDto.fromEntity(updatedUser);
    }

    @Override
    @Transactional
    public UserDto updateUserAvatar(UUID id, MultipartFile file) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        UploadedMediaResult result = cloudinaryStorageService.uploadFile(file);
        user.setAvatarUrl(result.getMediaUrl());
        User updatedUser = userRepository.save(user);
        log.info("Uploaded avatar for user {}: {}", id, result.getMediaUrl());
        return UserDto.fromEntity(updatedUser);
    }
}
