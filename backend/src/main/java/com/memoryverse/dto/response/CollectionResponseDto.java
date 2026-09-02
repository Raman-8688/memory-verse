package com.memoryverse.dto.response;

import com.memoryverse.entity.Memory;
import com.memoryverse.entity.MemoryCollection;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectionResponseDto {

    private UUID id;
    private String title;
    private String description;
    private String coverImageUrl;
    private int memoryCount;
    private UserDto createdBy;
    private Instant createdAt;

    public static CollectionResponseDto fromEntity(MemoryCollection collection) {
        if (collection == null) return null;

        String cover = collection.getCoverImageUrl();
        if ((cover == null || cover.isBlank()) && collection.getMemories() != null && !collection.getMemories().isEmpty()) {
            for (Memory m : collection.getMemories()) {
                if (m.getMediaList() != null && !m.getMediaList().isEmpty()) {
                    cover = m.getMediaList().get(0).getThumbnailUrl() != null
                            ? m.getMediaList().get(0).getThumbnailUrl()
                            : m.getMediaList().get(0).getMediaUrl();
                    break;
                }
            }
        }

        return CollectionResponseDto.builder()
                .id(collection.getId())
                .title(collection.getTitle())
                .description(collection.getDescription())
                .coverImageUrl(cover)
                .memoryCount(collection.getMemories() != null ? collection.getMemories().size() : 0)
                .createdBy(UserDto.fromEntity(collection.getCreatedBy()))
                .createdAt(collection.getCreatedAt())
                .build();
    }
}
