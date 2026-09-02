package com.memoryverse.integration.ai;

import com.memoryverse.dto.response.AiMemorySummaryDto;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PromptContextBuilder {

    /**
     * Serializes a list of retrieved memory summaries into a concise,
     * highly structured textual context for the LLM prompt.
     * Prevents context window explosion while providing all relevant facts.
     */
    public String buildContext(List<AiMemorySummaryDto> summaries) {
        if (summaries == null || summaries.isEmpty()) {
            return "No matching memories found in the database.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("FACTUAL MEMORIES RETRIEVED FROM DATABASE (").append(summaries.size()).append(" matches):\n\n");

        int index = 1;
        for (AiMemorySummaryDto mem : summaries) {
            sb.append("[").append(index++).append("] Title: ").append(mem.getTitle()).append("\n");
            sb.append("   Date: ").append(mem.getMemoryDate() != null ? mem.getMemoryDate().toString() : "Unknown").append("\n");

            if (mem.getJourneyTitle() != null) {
                sb.append("   Journey: ").append(mem.getJourneyTitle());
                if (mem.getSectionTitle() != null) {
                    sb.append(" (Chapter/Section: ").append(mem.getSectionTitle()).append(")");
                }
                sb.append("\n");
            }

            if (mem.getLocationName() != null && !mem.getLocationName().isBlank()) {
                sb.append("   Location: ").append(mem.getLocationName()).append("\n");
            }

            if (mem.getCreatedByName() != null) {
                sb.append("   Uploaded By: ").append(mem.getCreatedByName()).append("\n");
            }

            if (mem.getTaggedFriends() != null && !mem.getTaggedFriends().isEmpty()) {
                sb.append("   Friends Present: ").append(String.join(", ", mem.getTaggedFriends())).append("\n");
            }

            sb.append("   Media Available: ").append(mem.getPhotoCount()).append(" photograph(s), ")
              .append(mem.getVideoCount()).append(" video(s)\n");

            if (mem.getStorySummary() != null && !mem.getStorySummary().isBlank()) {
                sb.append("   Story Excerpt: \"").append(mem.getStorySummary()).append("\"\n");
            }
            sb.append("\n");
        }

        return sb.toString();
    }
}
