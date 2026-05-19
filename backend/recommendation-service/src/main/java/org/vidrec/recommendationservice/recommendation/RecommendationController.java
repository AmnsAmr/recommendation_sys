package org.vidrec.recommendationservice.recommendation;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final SimilarVideoService similarVideoService;
    private final ColdStartService coldStartService;

    @GetMapping("/similar/{videoId}")
    public SimilarVideosResponse getSimilarVideos(
            @PathVariable String videoId,
            @RequestParam(defaultValue = "10") int limit) {
        return similarVideoService.getSimilarVideos(videoId, limit);
    }

    @GetMapping("/cold/{categoryId}")
    public ColdStartRecommendationsResponse getColdByCategory(
            @PathVariable String categoryId,
            @RequestParam(defaultValue = "20") int limit) {
        return new ColdStartRecommendationsResponse(
                categoryId,
                coldStartService.getColdByCategory(categoryId, limit),
                LocalDateTime.now());
    }
}
