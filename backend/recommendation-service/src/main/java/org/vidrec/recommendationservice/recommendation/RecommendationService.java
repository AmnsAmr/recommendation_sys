package org.vidrec.recommendationservice.recommendation;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vidrec.recommendationservice.cache.RecommendationCacheService;
import org.vidrec.recommendationservice.interaction.Interaction;
import org.vidrec.recommendationservice.interaction.InteractionRepository;
import org.vidrec.recommendationservice.model.ItemFactor;
import org.vidrec.recommendationservice.model.ItemFactorRepository;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    static final int COLD_START_THRESHOLD = 5;
    private static final int DEFAULT_LIMIT = 20;

    private final InteractionRepository interactionRepository;
    private final ItemFactorRepository itemFactorRepository;
    private final ColdStartService coldStartService;
    private final HybridScorer hybridScorer;
    private final RecommendationCacheService cacheService;

    @Transactional(readOnly = true)
    public RecommendationResponse getRecommendations(UUID userId, int limit) {
        int resolvedLimit = limit <= 0 ? DEFAULT_LIMIT : limit;
        long interactionCount = interactionRepository.countByUserId(userId);
        boolean hybridReady = interactionCount >= COLD_START_THRESHOLD;
        boolean cacheableRequest = hybridReady && resolvedLimit == DEFAULT_LIMIT;

        if (cacheableRequest) {
            return cacheService.get(userId)
                .map(cached -> new RecommendationResponse(
                    userId.toString(),
                    cached,
                    "hybrid_cached",
                    LocalDateTime.now()))
                .orElseGet(() -> generateRecommendations(userId, resolvedLimit, interactionCount));
        }

        return generateRecommendations(userId, resolvedLimit, interactionCount);
    }

    private RecommendationResponse generateRecommendations(UUID userId, int limit, long interactionCount) {
        if (interactionCount < COLD_START_THRESHOLD) {
            return generateColdStart(userId, limit);
        }

        return generateHybrid(userId, limit);
    }

    private RecommendationResponse generateColdStart(UUID userId, int limit) {
        List<String> ranked = coldStartService.getColdByUser(userId, limit);

        return new RecommendationResponse(
            userId.toString(),
            ranked,
            "declared_cold_start",
            LocalDateTime.now());
    }

    private RecommendationResponse generateHybrid(UUID userId, int limit) {
        List<String> candidates = candidateVideoIds(userId);
        List<String> ranked = hybridScorer.score(userId, candidates, limit);
        cacheService.put(userId, ranked);

        return new RecommendationResponse(
            userId.toString(),
            ranked,
            "hybrid",
            LocalDateTime.now());
    }

    private List<String> candidateVideoIds(UUID userId) {
        Set<String> seen = new HashSet<>(interactionRepository.findByUserId(userId).stream()
            .map(Interaction::getVideoId)
            .toList());

        return itemFactorRepository.findAll().stream()
            .map(ItemFactor::getVideoId)
            .filter(videoId -> !seen.contains(videoId))
            .toList();
    }
}
