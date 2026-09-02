package com.memoryverse.service;

import com.memoryverse.dto.request.MemorySearchCriteria;
import com.memoryverse.dto.response.AiChatResponseDto;
import com.memoryverse.dto.response.AiMemorySummaryDto;

import java.util.List;

public interface MemoryRetrievalService {

    List<AiMemorySummaryDto> retrieveMemories(MemorySearchCriteria criteria);

    List<AiMemorySummaryDto> retrieveMemories(MemorySearchCriteria criteria, int maxResults);

    List<AiMemorySummaryDto> retrieveRecentMemories(int maxResults);

    List<AiChatResponseDto.RelatedMemoryDto> toRelatedMemoryDtos(List<AiMemorySummaryDto> summaries);

    List<AiChatResponseDto.RelatedMediaDto> toRelatedMediaDtos(List<AiMemorySummaryDto> summaries);
}
