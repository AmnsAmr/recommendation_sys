package org.vidrec.recommendationservice.recommendation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vidrec.recommendationservice.interaction.InteractionRepository;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    static final int COLD_START_THRESHOLD = 5;
    private static final int DEFAULT_LIMIT = 20;

    private final InteractionRepository interactionRepository;
    private final ColdStartService coldStartService;

    @Transactional(readOnly = true)
    public RecommendationResponse getRecommendations(UUID userId, int limit) {
        int resolvedLimit = limit <= 0 ? DEFAULT_LIMIT : limit;
        long interactionCount = interactionRepository.countByUserId(userId);

        List<String> videoIds = coldStartService.getColdByUser(userId, resolvedLimit);
        String strategy = interactionCount < COLD_START_THRESHOLD
                ? "declared_cold_start"
                : "content_fallback";

        return new RecommendationResponse(
                userId.toString(),
                videoIds,
                strategy,
                LocalDateTime.now());
    }
}
