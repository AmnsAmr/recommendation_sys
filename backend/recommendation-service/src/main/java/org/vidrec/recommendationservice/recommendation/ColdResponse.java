package org.vidrec.recommendationservice.recommendation;

import java.time.LocalDateTime;
import java.util.List;

public record ColdResponse(
    String categoryId,
    List<String> videoIds,
    LocalDateTime generatedAt
) {}
