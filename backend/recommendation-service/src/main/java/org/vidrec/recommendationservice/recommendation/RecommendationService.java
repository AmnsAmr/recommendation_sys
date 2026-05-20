package org.vidrec.recommendationservice.recommendation;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.vidrec.recommendationservice.cache.RecommendationCacheService;
import org.vidrec.recommendationservice.interaction.Interaction;
import org.vidrec.recommendationservice.interaction.InteractionRepository;
import org.vidrec.recommendationservice.model.ItemFactor;
import org.vidrec.recommendationservice.model.ItemFactorRepository;
import org.vidrec.recommendationservice.model.UserCategoryProfile;
import org.vidrec.recommendationservice.model.UserCategoryProfileRepository;
import org.vidrec.recommendationservice.shared.exception.ApiException;

@Service
public class RecommendationService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationService.class);
    private static final int COLD_START_THRESHOLD = 5;

    private final RecommendationCacheService cacheService;
    private final InteractionRepository interactionRepository;
    private final ItemFactorRepository itemFactorRepository;
    private final UserCategoryProfileRepository userCategoryProfileRepository;
    private final HybridScorer hybridScorer;
    private final ApplicationContext applicationContext;

    public RecommendationService(
        RecommendationCacheService cacheService,
        InteractionRepository interactionRepository,
        ItemFactorRepository itemFactorRepository,
        UserCategoryProfileRepository userCategoryProfileRepository,
        HybridScorer hybridScorer,
        ApplicationContext applicationContext
    ) {
        this.cacheService = cacheService;
        this.interactionRepository = interactionRepository;
        this.itemFactorRepository = itemFactorRepository;
        this.userCategoryProfileRepository = userCategoryProfileRepository;
        this.hybridScorer = hybridScorer;
        this.applicationContext = applicationContext;
    }

    public RecommendationResponse getRecommendations(UUID userId, int limit) {
        LocalDateTime generatedAt = LocalDateTime.now();
        return cacheService.get(userId)
            .map(videoIds -> new RecommendationResponse(userId, "hybrid", videoIds, LocalDateTime.now(), generatedAt))
            .orElseGet(() -> generateRecommendations(userId, limit, generatedAt));
    }

    public SimilarResponse getSimilarVideos(String videoId, int limit) {
        List<String> videoIds = callListService("similarVideoService", "getSimilarVideos", new Class<?>[] {String.class, int.class}, videoId, limit);
        if (videoIds == null) {
            videoIds = fallbackSimilarVideos(videoId, limit);
        }
        return new SimilarResponse(videoId, videoIds, LocalDateTime.now());
    }

    public ColdResponse getColdStartByCategory(String categoryId, int limit) {
        List<String> videoIds = callListService("coldStartService", "getColdByCategory", new Class<?>[] {String.class, int.class}, categoryId, limit);
        if (videoIds == null) {
            videoIds = fallbackColdByCategory(categoryId, limit);
        }
        return new ColdResponse(categoryId, videoIds, LocalDateTime.now());
    }

    private RecommendationResponse generateRecommendations(UUID userId, int limit, LocalDateTime generatedAt) {
        long interactionCount = interactionRepository.countByUserId(userId);
        if (interactionCount < COLD_START_THRESHOLD) {
            List<String> coldVideoIds = callListService("coldStartService", "getColdByUser", new Class<?>[] {UUID.class, int.class}, userId, limit);
            if (coldVideoIds == null) {
                coldVideoIds = fallbackColdByUser(userId, limit);
            }
            return new RecommendationResponse(userId, "cold_start", coldVideoIds, null, generatedAt);
        }

        List<String> candidates = candidateVideoIds(userId);
        List<String> rankedVideoIds = hybridScorer.score(userId, candidates, limit);
        cacheService.put(userId, rankedVideoIds);

        return new RecommendationResponse(userId, "hybrid", rankedVideoIds, null, generatedAt);
    }

    private List<String> candidateVideoIds(UUID userId) {
        Set<String> seenVideoIds = new HashSet<>(interactionRepository.findByUserId(userId).stream()
            .map(Interaction::getVideoId)
            .toList());

        return itemFactorRepository.findAll().stream()
            .map(ItemFactor::getVideoId)
            .filter(videoId -> !seenVideoIds.contains(videoId))
            .toList();
    }

    private List<String> fallbackColdByUser(UUID userId, int limit) {
        List<UserCategoryProfile> profiles = userCategoryProfileRepository.findByUserId(userId);
        if (profiles.isEmpty()) {
            throw new ApiException("NO_PREFERENCES", "Cold-start user has no declared preferences.", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        Set<String> preferredCategories = profiles.stream()
            .sorted(Comparator.comparing(UserCategoryProfile::getWeight).reversed())
            .map(UserCategoryProfile::getCategory)
            .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));

        List<String> videoIds = itemFactorRepository.findAll().stream()
            .filter(item -> preferredCategories.contains(item.getCategoryId()))
            .sorted(Comparator.comparing(ItemFactor::getGlobalScore, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(ItemFactor::getVideoId)
            .limit(limit)
            .toList();

        if (videoIds.isEmpty()) {
            throw new ApiException("NO_PREFERENCES", "Cold-start user has no declared preferences.", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        return videoIds;
    }

    private List<String> fallbackColdByCategory(String categoryId, int limit) {
        List<String> videoIds = itemFactorRepository.findByCategoryId(categoryId).stream()
            .sorted(Comparator.comparing(ItemFactor::getGlobalScore, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(ItemFactor::getVideoId)
            .limit(limit)
            .toList();

        if (videoIds.isEmpty()) {
            throw new ApiException("CATEGORY_NOT_FOUND", "No videos found for category.", HttpStatus.NOT_FOUND);
        }
        return videoIds;
    }

    private List<String> fallbackSimilarVideos(String videoId, int limit) {
        ItemFactor source = itemFactorRepository.findByVideoId(videoId)
            .orElseThrow(() -> new ApiException("VIDEO_NOT_FOUND", "No item_factors record found for videoId.", HttpStatus.NOT_FOUND));

        return itemFactorRepository.findAll().stream()
            .filter(candidate -> !candidate.getVideoId().equals(videoId))
            .sorted((left, right) -> Double.compare(cosine(source.getVector(), right.getVector()), cosine(source.getVector(), left.getVector())))
            .map(ItemFactor::getVideoId)
            .limit(limit)
            .toList();
    }

    @SuppressWarnings("unchecked")
    private List<String> callListService(String beanName, String methodName, Class<?>[] parameterTypes, Object... args) {
        try {
            Object service = applicationContext.getBean(beanName);
            Method method = service.getClass().getMethod(methodName, parameterTypes);
            Object result = method.invoke(service, args);
            if (result instanceof List<?> list) {
                return (List<String>) list;
            }
        } catch (Exception ex) {
            log.debug("{}#{} is not available; using local fallback.", beanName, methodName, ex);
        }
        return null;
    }

    private double cosine(Double[] left, Double[] right) {
        if (left == null || right == null || left.length == 0 || right.length == 0 || left.length != right.length) {
            return 0.0;
        }

        double dot = 0.0;
        double leftNorm = 0.0;
        double rightNorm = 0.0;
        for (int index = 0; index < left.length; index++) {
            double leftValue = left[index] == null ? 0.0 : left[index];
            double rightValue = right[index] == null ? 0.0 : right[index];
            dot += leftValue * rightValue;
            leftNorm += leftValue * leftValue;
            rightNorm += rightValue * rightValue;
        }

        if (leftNorm == 0.0 || rightNorm == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
    }
}
