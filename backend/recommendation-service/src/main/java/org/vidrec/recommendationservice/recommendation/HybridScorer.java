package org.vidrec.recommendationservice.recommendation;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vidrec.recommendationservice.content.ContentBasedService;

@Service
@RequiredArgsConstructor
public class HybridScorer {

    private static final double SVD_WEIGHT = 0.6;
    private static final double CONTENT_WEIGHT = 0.4;

    private final SvdClient svdClient;
    private final ContentBasedService contentBasedService;

    public List<String> score(UUID userId, List<String> candidateVideoIds, int limit) {
        if (candidateVideoIds.isEmpty()) {
            return List.of();
        }

        Map<String, Double> svdScores = svdClient.predictBatch(userId.toString(), candidateVideoIds);
        Map<String, Double> contentScores = contentBasedService.scoreCandidates(userId, candidateVideoIds);
        Map<String, Double> normalizedSvd = normalize(candidateVideoIds, svdScores);
        Map<String, Double> normalizedContent = normalize(candidateVideoIds, contentScores);

        return candidateVideoIds.stream()
            .sorted((left, right) -> Double.compare(
                blendedScore(right, normalizedSvd, normalizedContent),
                blendedScore(left, normalizedSvd, normalizedContent)
            ))
            .limit(limit)
            .toList();
    }

    private double blendedScore(String videoId, Map<String, Double> svdScores, Map<String, Double> contentScores) {
        return SVD_WEIGHT * svdScores.getOrDefault(videoId, 0.0)
            + CONTENT_WEIGHT * contentScores.getOrDefault(videoId, 0.0);
    }

    private Map<String, Double> normalize(List<String> candidateVideoIds, Map<String, Double> scores) {
        double min = candidateVideoIds.stream()
            .mapToDouble(videoId -> scores.getOrDefault(videoId, 0.0))
            .min()
            .orElse(0.0);
        double max = candidateVideoIds.stream()
            .mapToDouble(videoId -> scores.getOrDefault(videoId, 0.0))
            .max()
            .orElse(0.0);

        Map<String, Double> normalized = new HashMap<>();
        if (Double.compare(min, max) == 0) {
            candidateVideoIds.forEach(videoId -> normalized.put(videoId, 0.5));
            return normalized;
        }

        candidateVideoIds.forEach(videoId -> {
            double value = scores.getOrDefault(videoId, 0.0);
            normalized.put(videoId, (value - min) / (max - min));
        });
        return normalized;
    }
}
