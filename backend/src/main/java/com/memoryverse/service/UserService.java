package com.memoryverse.service;

import com.memoryverse.dto.request.UserCreateRequest;
import com.memoryverse.dto.request.UserUpdateRequest;
import com.memoryverse.dto.response.PersonSummaryDto;
import com.memoryverse.dto.response.UserDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface UserService {

    List<UserDto> getAllUsers();

    List<PersonSummaryDto> getPeopleDirectory();

    UserDto createUser(UserCreateRequest request);

    UserDto updateUser(UUID id, UserUpdateRequest request);

    UserDto updateUserAvatar(UUID id, MultipartFile file);
}

