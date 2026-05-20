package org.vidrec.recommendationservice.recommendation;

import java.util.Map;

public final class RecommendationCategoryMapper {

    private static final Map<String, String> UI_TO_BACKEND_CATEGORY = Map.ofEntries(
            Map.entry("fashion", "howto-style"),
            Map.entry("music", "music"),
            Map.entry("sport", "sports"),
            Map.entry("food", "howto-style"),
            Map.entry("travel", "travel-events"),
            Map.entry("gaming", "gaming"),
            Map.entry("backend", "science-technology"),
            Map.entry("frontend", "science-technology"),
            Map.entry("ai", "science-technology"),
            Map.entry("data", "science-technology"),
            Map.entry("devops", "science-technology"),
            Map.entry("design", "howto-style"),
            Map.entry("education", "education"),
            Map.entry("for you", "science-technology")
    );

    private RecommendationCategoryMapper() {
    }

    public static String normalize(String category) {
        if (category == null) {
            return null;
        }

        String trimmed = category.trim();
        if (trimmed.isBlank()) {
            return null;
        }

        return UI_TO_BACKEND_CATEGORY.getOrDefault(trimmed.toLowerCase(), trimmed.toLowerCase());
    }
}
