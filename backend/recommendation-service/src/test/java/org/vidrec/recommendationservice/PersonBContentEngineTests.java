package org.vidrec.recommendationservice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.vidrec.recommendationservice.content.ContentBasedService;
import org.vidrec.recommendationservice.interaction.EventType;
import org.vidrec.recommendationservice.interaction.Interaction;
import org.vidrec.recommendationservice.interaction.InteractionRepository;
import org.vidrec.recommendationservice.model.ItemFactorRepository;
import org.vidrec.recommendationservice.model.ItemFactorService;
import org.vidrec.recommendationservice.model.UserCategoryProfileRepository;
import org.vidrec.recommendationservice.model.UserCategoryProfileService;
import org.vidrec.recommendationservice.recommendation.ColdStartService;
import org.vidrec.recommendationservice.recommendation.SimilarVideoService;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PersonBContentEngineTests {

    @Autowired
    private ItemFactorService itemFactorService;

    @Autowired
    private ItemFactorRepository itemFactorRepository;

    @Autowired
    private UserCategoryProfileService userCategoryProfileService;

    @Autowired
    private UserCategoryProfileRepository userCategoryProfileRepository;

    @Autowired
    private InteractionRepository interactionRepository;

    @Autowired
    private ContentBasedService contentBasedService;

    @Autowired
    private SimilarVideoService similarVideoService;

    @Autowired
    private ColdStartService coldStartService;

    @Test
    void contentEngineScoresAndRanksCandidates() {
        UUID userId = UUID.randomUUID();
        itemFactorService.upsert("v-music-1", List.of("guitar", "live"), "music", "thumb-1", "en");
        itemFactorService.upsert("v-music-2", List.of("guitar", "acoustic"), "music", "thumb-2", "en");
        itemFactorService.upsert("v-sports-1", List.of("football"), "sports", "thumb-3", "en");
        itemFactorService.incrementViewCount("v-music-2");
        itemFactorService.incrementViewCount("v-music-2");
        userCategoryProfileService.insertDeclared(userId, List.of("music"));

        interactionRepository.save(Interaction.builder()
                .userId(userId)
                .videoId("v-music-1")
                .eventType(EventType.LIKE)
                .score(3.0)
                .build());

        Map<String, Double> scores = contentBasedService.scoreCandidates(
                userId,
                List.of("v-music-2", "v-sports-1", "missing-video"));

        assertThat(scores).containsKeys("v-music-2", "v-sports-1", "missing-video");
        assertThat(scores.get("v-music-2")).isGreaterThan(scores.get("v-sports-1"));
        assertThat(scores.get("missing-video")).isZero();

        assertThat(similarVideoService.getSimilarVideos("v-music-1", 1).similarVideoIds())
                .containsExactly("v-music-2");
        assertThat(coldStartService.getColdByCategory("music", 1))
                .containsExactly("v-music-2");
        assertThat(coldStartService.getColdByUser(userId, 2))
                .contains("v-music-1", "v-music-2");
    }

    @Test
    void servicesMaintainFactorsAndDeclaredProfiles() {
        UUID userId = UUID.randomUUID();
        itemFactorService.upsert("v-1", List.of("java"), "education", "old", "en");
        itemFactorService.upsert("v-1", List.of("spring"), "technology", "new", "fr");
        itemFactorService.incrementViewCount("v-1");

        var item = itemFactorRepository.findById("v-1").orElseThrow();
        assertThat(item.getTags()).containsExactly("spring");
        assertThat(item.getCategoryId()).isEqualTo("technology");
        assertThat(item.getThumbnailUrl()).isEqualTo("new");
        assertThat(item.getLanguage()).isEqualTo("fr");
        assertThat(item.getViewCount()).isEqualTo(1L);
        assertThat(item.getGlobalScore()).isGreaterThan(0.0);

        userCategoryProfileService.insertDeclared(userId, List.of("music", "sports"));
        userCategoryProfileService.replaceDeclared(userId, List.of("education"));

        assertThat(userCategoryProfileRepository.findByUserId(userId))
                .singleElement()
                .satisfies(profile -> {
                    assertThat(profile.getCategory()).isEqualTo("education");
                    assertThat(profile.getSource()).isEqualTo("declared");
                    assertThat(profile.getWeight()).isEqualTo(1.0);
                });
    }

    @Test
    void coldStartRequiresDeclaredPreferences() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> coldStartService.getColdByUser(userId, 10))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("NO_PREFERENCES");
    }
}
