package org.vidrec.recommendationservice.content;

import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vidrec.recommendationservice.interaction.Interaction;
import org.vidrec.recommendationservice.interaction.InteractionRepository;
import org.vidrec.recommendationservice.model.ItemFactor;
import org.vidrec.recommendationservice.model.ItemFactorRepository;
import org.vidrec.recommendationservice.model.UserCategoryProfile;
import org.vidrec.recommendationservice.model.UserCategoryProfileRepository;
import org.vidrec.recommendationservice.model.UserCategoryProfileService;

@Service
@RequiredArgsConstructor
public class ContentBasedService {

    private final InteractionRepository interactionRepository;
    private final ItemFactorRepository itemFactorRepository;
    private final UserCategoryProfileRepository userCategoryProfileRepository;

    @Transactional(readOnly = true)
    public double[] buildUserContentProfile(List<Interaction> interactions) {
        double[] profile = new double[ContentVectorizer.VECTOR_SIZE];
        if (interactions == null || interactions.isEmpty()) {
            return profile;
        }

        List<String> videoIds = interactions.stream()
                .map(Interaction::getVideoId)
                .distinct()
                .toList();
        Map<String, ItemFactor> itemsByVideoId = itemFactorRepository.findAllByVideoIdIn(videoIds).stream()
                .collect(Collectors.toMap(ItemFactor::getVideoId, Function.identity()));

        for (Interaction interaction : interactions) {
            ItemFactor itemFactor = itemsByVideoId.get(interaction.getVideoId());
            if (itemFactor == null) {
                continue;
            }

            double[] itemVector = itemVector(itemFactor);
            double weight = interaction.getScore() == null ? 1.0 : interaction.getScore();
            for (int i = 0; i < profile.length && i < itemVector.length; i++) {
                profile[i] += itemVector[i] * weight;
            }
        }

        return ContentVectorizer.normalize(profile);
    }

    public double cosineSimilarity(double[] v1, double[] v2) {
        if (v1 == null || v2 == null || v1.length == 0 || v2.length == 0) {
            return 0.0;
        }

        int length = Math.min(v1.length, v2.length);
        double dot = 0.0;
        double norm1 = 0.0;
        double norm2 = 0.0;
        for (int i = 0; i < length; i++) {
            dot += v1[i] * v2[i];
            norm1 += v1[i] * v1[i];
            norm2 += v2[i] * v2[i];
        }

        if (norm1 == 0.0 || norm2 == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    @Transactional(readOnly = true)
    public Map<String, Double> scoreCandidates(UUID userId, List<String> candidateVideoIds) {
        return scoreCandidates(userId, candidateVideoIds, true);
    }

    @Transactional(readOnly = true)
    public Map<String, Double> scoreCandidates(UUID userId, List<String> candidateVideoIds, boolean includeDeclaredProfile) {
        if (candidateVideoIds == null || candidateVideoIds.isEmpty()) {
            return Map.of();
        }

        double[] userProfile = buildUserContentProfile(interactionRepository.findByUserId(userId));
        if (includeDeclaredProfile) {
            blendDeclaredProfile(userProfile, userId);
        }
        ContentVectorizer.normalize(userProfile);

        Map<String, ItemFactor> candidates = itemFactorRepository.findAllByVideoIdIn(candidateVideoIds).stream()
                .collect(Collectors.toMap(ItemFactor::getVideoId, Function.identity()));

        Map<String, Double> scores = new LinkedHashMap<>();
        for (String videoId : candidateVideoIds) {
            ItemFactor candidate = candidates.get(videoId);
            scores.put(videoId, candidate == null ? 0.0 : cosineSimilarity(userProfile, itemVector(candidate)));
        }
        return scores;
    }

    @Transactional(readOnly = true)
    public List<String> getSimilarItems(String videoId, int limit) {
        ItemFactor target = itemFactorRepository.findById(videoId).orElse(null);
        if (target == null || limit <= 0) {
            return List.of();
        }

        double[] targetVector = itemVector(target);
        return itemFactorRepository.findAll().stream()
                .filter(item -> !item.getVideoId().equals(videoId))
                .map(item -> Map.entry(item.getVideoId(), cosineSimilarity(targetVector, itemVector(item))))
                .sorted(Map.Entry.<String, Double>comparingByValue(Comparator.reverseOrder()))
                .limit(limit)
                .map(Map.Entry::getKey)
                .toList();
    }

    private void blendDeclaredProfile(double[] userProfile, UUID userId) {
        List<UserCategoryProfile> declaredProfiles = userCategoryProfileRepository.findByUserIdAndSource(
                userId,
                UserCategoryProfileService.SOURCE_DECLARED);

        for (UserCategoryProfile profile : declaredProfiles) {
            double weight = profile.getWeight() == null ? 1.0 : profile.getWeight();
            ContentVectorizer.addFeature(
                    userProfile,
                    "category:" + ContentVectorizer.normalizeToken(profile.getCategory()),
                    weight * 2.0);
        }
    }

    private double[] itemVector(ItemFactor itemFactor) {
        Double[] storedVector = itemFactor.getVector();
        if (storedVector != null && Arrays.stream(storedVector).anyMatch(value -> value != null && value != 0.0)) {
            return ContentVectorizer.toPrimitive(storedVector);
        }

        List<String> tags = itemFactor.getTags() == null ? List.of() : Arrays.asList(itemFactor.getTags());
        return ContentVectorizer.encode(tags, itemFactor.getCategoryId(), itemFactor.getLanguage());
    }
}
