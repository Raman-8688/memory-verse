package com.memoryverse.service.impl;

import com.memoryverse.dto.request.UserCreateRequest;
import com.memoryverse.dto.request.UserUpdateRequest;
import com.memoryverse.dto.response.PersonSummaryDto;
import com.memoryverse.dto.response.UploadedMediaResult;
import com.memoryverse.dto.response.UserDto;
import com.memoryverse.entity.Role;
import com.memoryverse.entity.User;
import com.memoryverse.exception.BusinessValidationException;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.integration.storage.CloudinaryStorageService;
import com.memoryverse.config.RedisConfig;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_PEOPLE, RedisConfig.CACHE_DASHBOARD}, allEntries = true)
    public UserDto createUser(UserCreateRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BusinessValidationException("An account with email " + normalizedEmail + " already exists.");
        }

        User user = User.builder()
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .role(request.getRole() != null ? request.getRole() : Role.MEMBER)
                .avatarUrl(request.getAvatarUrl() != null && !request.getAvatarUrl().isBlank()
                        ? request.getAvatarUrl().trim()
                        : null)
                .build();

        User saved = userRepository.save(user);
        log.info("Admin created new user: id={}, email={}, role={}", saved.getId(), saved.getEmail(), saved.getRole());
        return UserDto.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PersonSummaryDto> getPeopleDirectory() {
        return userRepository.findPeopleSummary().stream()
                .map(p -> PersonSummaryDto.builder()
                        .id(p.getId())
                        .fullName(p.getFullName())
                        .email(p.getEmail())
                        .avatarUrl(p.getAvatarUrl())
                        .role(p.getRole() != null ? Role.valueOf(p.getRole()) : null)
                        .memoryCount(p.getMemoryCount() != null ? p.getMemoryCount() : 0)
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_PEOPLE, key = "#userId")
    public List<PersonSummaryDto> getPeopleDirectory(UUID userId) {
        log.debug("Fetching people directory for user {} (cache miss)", userId);
        return getPeopleDirectory();
    }

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_PEOPLE, RedisConfig.CACHE_DASHBOARD}, allEntries = true)
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
    @CacheEvict(value = {RedisConfig.CACHE_PEOPLE, RedisConfig.CACHE_DASHBOARD}, allEntries = true)
    public UserDto updateUserAvatar(UUID id, MultipartFile file) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        UploadedMediaResult result = cloudinaryStorageService.uploadFile(file);
        user.setAvatarUrl(result.getMediaUrl());
        User updatedUser = userRepository.save(user);
        log.info("Uploaded avatar for user {}: {}", id, result.getMediaUrl());
        return UserDto.fromEntity(updatedUser);
    }

    @Override
    @Transactional
    @CacheEvict(value = {RedisConfig.CACHE_PEOPLE, RedisConfig.CACHE_DASHBOARD}, allEntries = true)
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        log.warn("Account deletion requested for user: id={}, email={}", id, user.getEmail());

        try {
            userRepository.delete(user);
            userRepository.flush();
            log.info("User {} successfully deleted from database", id);
        } catch (Exception e) {
            log.warn("User {} has linked memories/journals; applying GDPR privacy anonymization instead: {}", id, e.getMessage());
            user.setEmail("deleted_" + id.toString().substring(0, 8) + "@memoryverse.local");
            user.setFullName("Former Member");
            user.setAvatarUrl(null);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            userRepository.save(user);
            log.info("User {} successfully anonymized and scrubbed", id);
        }
    }
}
