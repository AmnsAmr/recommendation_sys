package org.vidrec.recommendationservice.recommendation;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;

@Service
public class HybridScorer {

    private static final Logger log = LoggerFactory.getLogger(HybridScorer.class);
    private static final double SVD_WEIGHT = 0.6;
    private static final double CONTENT_WEIGHT = 0.4;

    private final SvdClient svdClient;
    private final ApplicationContext applicationContext;

    public HybridScorer(SvdClient svdClient, ApplicationContext applicationContext) {
        this.svdClient = svdClient;
        this.applicationContext = applicationContext;
    }

    public List<String> score(UUID userId, List<String> candidateVideoIds, int limit) {
        if (candidateVideoIds.isEmpty()) {
            return List.of();
        }

        Map<String, Double> svdScores = svdClient.predictBatch(userId.toString(), candidateVideoIds);
        Map<String, Double> contentScores = contentScores(userId, candidateVideoIds);
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

    @SuppressWarnings("unchecked")
    private Map<String, Double> contentScores(UUID userId, List<String> candidateVideoIds) {
        try {
            Object service = applicationContext.getBean("contentBasedService");
            Method method = service.getClass().getMethod("scoreCandidates", UUID.class, List.class);
            Object result = method.invoke(service, userId, candidateVideoIds);
            if (result instanceof Map<?, ?> map) {
                Map<String, Double> scores = new HashMap<>();
                map.forEach((key, value) -> scores.put(String.valueOf(key), value instanceof Number number ? number.doubleValue() : 0.0));
                return scores;
            }
        } catch (Exception ex) {
            log.debug("ContentBasedService.scoreCandidates is not available; using neutral content scores.", ex);
        }

        Map<String, Double> scores = new HashMap<>();
        candidateVideoIds.forEach(videoId -> scores.put(videoId, 0.0));
        return scores;
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
