package org.vidrec.recommendationservice.recommendation;

import java.time.LocalDateTime;
import java.util.List;

public record SimilarVideosResponse(
        String videoId,
        List<String> similarVideoIds,
        LocalDateTime generatedAt) {
}
