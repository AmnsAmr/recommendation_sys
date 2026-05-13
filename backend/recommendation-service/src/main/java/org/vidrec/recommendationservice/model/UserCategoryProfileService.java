package org.vidrec.recommendationservice.model;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserCategoryProfileService {

    public static final String SOURCE_DECLARED = "declared";

    private final UserCategoryProfileRepository userCategoryProfileRepository;

    @Transactional
    public List<UserCategoryProfile> insertDeclared(UUID userId, List<String> interests) {
        return userCategoryProfileRepository.saveAll(toDeclaredProfiles(userId, interests));
    }

    @Transactional
    public List<UserCategoryProfile> replaceDeclared(UUID userId, List<String> preferences) {
        userCategoryProfileRepository.deleteByUserIdAndSource(userId, SOURCE_DECLARED);
        return insertDeclared(userId, preferences);
    }

    private List<UserCategoryProfile> toDeclaredProfiles(UUID userId, List<String> categories) {
        if (categories == null) {
            categories = Collections.emptyList();
        }

        LocalDateTime now = LocalDateTime.now();
        return categories.stream()
                .filter(category -> category != null && !category.isBlank())
                .map(String::trim)
                .distinct()
                .map(category -> UserCategoryProfile.builder()
                        .userId(userId)
                        .category(category)
                        .weight(1.0)
                        .source(SOURCE_DECLARED)
                        .updatedAt(now)
                        .build())
                .toList();
    }
}
