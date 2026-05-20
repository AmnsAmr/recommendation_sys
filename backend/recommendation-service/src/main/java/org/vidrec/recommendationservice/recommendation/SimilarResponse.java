package org.vidrec.recommendationservice.recommendation;

import java.time.LocalDateTime;
import java.util.List;

public record SimilarResponse(
    String videoId,
    List<String> similarVideoIds,
    LocalDateTime generatedAt
) {}
