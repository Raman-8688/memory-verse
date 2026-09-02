package com.memoryverse.service;

import com.memoryverse.dto.request.UserUpdateRequest;
import com.memoryverse.dto.response.UserDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface UserService {

    List<UserDto> getAllUsers();

    UserDto updateUser(UUID id, UserUpdateRequest request);

    UserDto updateUserAvatar(UUID id, MultipartFile file);
}
