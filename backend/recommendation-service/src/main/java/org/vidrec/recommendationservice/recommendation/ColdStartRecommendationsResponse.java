package org.vidrec.recommendationservice.recommendation;

import java.time.LocalDateTime;
import java.util.List;

public record ColdStartRecommendationsResponse(
        String categoryId,
        List<String> videoIds,
        LocalDateTime generatedAt) {
}
