package com.memoryverse.dto.response;

import com.memoryverse.entity.Moment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MomentDto {
    private UUID id;
    private String caption;
    private UserDto author;
    private List<MomentMediaDto> media;
    private Instant createdAt;
    private Instant updatedAt;

    public static MomentDto fromEntity(Moment moment) {
        if (moment == null) return null;

        List<MomentMediaDto> mediaDtos = moment.getMediaList() == null
                ? Collections.emptyList()
                : moment.getMediaList().stream()
                .map(MomentMediaDto::fromEntity)
                .collect(Collectors.toList());

        return MomentDto.builder()
                .id(moment.getId())
                .caption(moment.getCaption())
                .author(UserDto.fromEntity(moment.getAuthor()))
                .media(mediaDtos)
                .createdAt(moment.getCreatedAt())
                .updatedAt(moment.getUpdatedAt())
                .build();
    }
}
