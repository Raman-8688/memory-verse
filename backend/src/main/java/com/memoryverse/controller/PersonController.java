package com.memoryverse.controller;

import com.memoryverse.dto.response.ApiResponse;
import com.memoryverse.dto.response.PersonSummaryDto;
import com.memoryverse.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/people")
@RequiredArgsConstructor
public class PersonController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PersonSummaryDto>>> getPeopleDirectory() {
        return ResponseEntity.ok(ApiResponse.success(userService.getPeopleDirectory()));
    }
}
