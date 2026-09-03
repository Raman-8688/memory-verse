package com.memoryverse.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageRequestDto {

    @Min(value = 0, message = "Page index must not be less than zero")
    @Builder.Default
    private int page = 0;

    @Min(value = 1, message = "Page size must not be less than one")
    @Max(value = 500, message = "Page size cannot exceed 500")
    @Builder.Default
    private int size = 20;

    @Builder.Default
    private String sortBy = "createdAt";

    @Builder.Default
    private String sortDirection = "DESC";

    public Pageable toPageable() {
        Sort.Direction direction = Sort.Direction.fromOptionalString(sortDirection.toUpperCase())
                .orElse(Sort.Direction.DESC);
        return PageRequest.of(page, size, Sort.by(direction, sortBy));
    }
}
