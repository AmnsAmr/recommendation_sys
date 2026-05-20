package org.vidrec.recommendationservice.recommendation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record RecommendationResponse(
    UUID userId,
    String strategy,
    List<String> videoIds,
    LocalDateTime cachedAt,
    LocalDateTime generatedAt
) {}
