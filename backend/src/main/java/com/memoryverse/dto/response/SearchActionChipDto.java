package com.memoryverse.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchActionChipDto implements Serializable {

    /**
     * Action type: VIEW_PHOTOS, VIEW_VIDEOS, VIEW_MEMORIES, FILTER_PERSON, FILTER_LOCATION
     */
    private String action;

    /**
     * UI button label: e.g. "View 12 Photos"
     */
    private String label;

    /**
     * Contextual value associated with the action (e.g. person name, location name)
     */
    private String value;

    /**
     * Count for badge display (e.g. 12)
     */
    private Integer count;
}
