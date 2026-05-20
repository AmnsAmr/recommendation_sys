package org.vidrec.recommendationservice.recommendation;

import java.time.LocalDateTime;
import java.util.List;

public record RecommendationResponse(
        String userId,
        List<String> videoIds,
        String strategy,
        LocalDateTime generatedAt) {
}
