package com.memoryverse.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiSearchRecordsResponseDto implements Serializable {

    private String searchToken;
    private String fetchType;
    private int page;
    private int size;
    private long totalCount;
    private boolean hasMore;

    @Builder.Default
    private List<MemoryResponseDto> memories = new ArrayList<>();

    @Builder.Default
    private List<AiChatResponseDto.RelatedMediaDto> mediaItems = new ArrayList<>();
}
