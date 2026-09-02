package com.memoryverse.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionSummaryDto {

    private String emoji;
    private long count;
    private boolean reactedByCurrentUser;
    private List<String> userNames;
}
