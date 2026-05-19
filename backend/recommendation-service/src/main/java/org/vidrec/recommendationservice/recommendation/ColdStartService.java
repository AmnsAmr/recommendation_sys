package org.vidrec.recommendationservice.recommendation;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.vidrec.recommendationservice.content.ContentBasedService;
import org.vidrec.recommendationservice.model.ItemFactor;
import org.vidrec.recommendationservice.model.ItemFactorRepository;
import org.vidrec.recommendationservice.model.UserCategoryProfile;
import org.vidrec.recommendationservice.model.UserCategoryProfileRepository;
import org.vidrec.recommendationservice.model.UserCategoryProfileService;

@Service
@RequiredArgsConstructor
public class ColdStartService {

    private final ItemFactorRepository itemFactorRepository;
    private final UserCategoryProfileRepository userCategoryProfileRepository;
    private final ContentBasedService contentBasedService;

    @Transactional(readOnly = true)
    public List<String> getColdByCategory(String categoryId, int limit) {
        if (limit <= 0) {
            return List.of();
        }

        return itemFactorRepository.findAllByCategoryIdOrderByGlobalScoreDesc(categoryId, PageRequest.of(0, limit))
                .stream()
                .map(ItemFactor::getVideoId)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> getColdByUser(UUID userId, int limit) {
        if (limit <= 0) {
            return List.of();
        }

        List<UserCategoryProfile> declaredProfiles = userCategoryProfileRepository.findByUserIdAndSource(
                userId,
                UserCategoryProfileService.SOURCE_DECLARED);
        if (declaredProfiles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "NO_PREFERENCES");
        }

        Map<String, Double> declaredWeightsByCategory = declaredProfiles.stream()
                .collect(Collectors.toMap(
                        UserCategoryProfile::getCategory,
                        profile -> profile.getWeight() == null ? 1.0 : profile.getWeight(),
                        Double::sum,
                        LinkedHashMap::new));

        Map<String, Double> categoryWeightByVideoId = new LinkedHashMap<>();
        for (Map.Entry<String, Double> declaredCategory : declaredWeightsByCategory.entrySet()) {
            itemFactorRepository.findByCategoryId(declaredCategory.getKey()).forEach(itemFactor ->
                    categoryWeightByVideoId.merge(
                            itemFactor.getVideoId(),
                            declaredCategory.getValue(),
                            Math::max));
        }

        if (categoryWeightByVideoId.isEmpty()) {
            return List.of();
        }

        Map<String, Double> contentScores = contentBasedService.scoreCandidates(
                userId,
                List.copyOf(categoryWeightByVideoId.keySet()));

        return contentScores.entrySet().stream()
                .map(entry -> Map.entry(
                        entry.getKey(),
                        entry.getValue() * categoryWeightByVideoId.getOrDefault(entry.getKey(), 1.0)))
                .sorted(Map.Entry.<String, Double>comparingByValue(Comparator.reverseOrder()))
                .limit(limit)
                .map(Map.Entry::getKey)
                .toList();
    }
}
