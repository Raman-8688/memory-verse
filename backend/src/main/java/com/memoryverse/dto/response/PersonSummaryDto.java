package com.memoryverse.dto.response;

import com.memoryverse.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonSummaryDto {

    private UUID id;
    private String fullName;
    private String email;
    private String avatarUrl;
    private Role role;
    private long memoryCount;
}
