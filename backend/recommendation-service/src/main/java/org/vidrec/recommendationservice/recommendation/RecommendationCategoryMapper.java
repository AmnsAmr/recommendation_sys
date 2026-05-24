package org.vidrec.recommendationservice.recommendation;

import java.util.Map;

public final class RecommendationCategoryMapper {

    private static final Map<String, String> LEGACY_UI_TO_BACKEND_CATEGORY = Map.ofEntries(
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

        String legacyMapping = LEGACY_UI_TO_BACKEND_CATEGORY.get(trimmed.toLowerCase());
        if (legacyMapping != null) {
            return legacyMapping;
        }

        String normalized = trimmed.toLowerCase()
                .replace("&", " ")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "")
                .replaceAll("-+", "-");

        return normalized.isBlank() ? null : normalized;
    }
}
