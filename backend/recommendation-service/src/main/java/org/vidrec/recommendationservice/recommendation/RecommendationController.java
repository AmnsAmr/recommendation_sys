package org.vidrec.recommendationservice.recommendation;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.vidrec.recommendationservice.shared.exception.ApiException;
import org.vidrec.recommendationservice.shared.exception.ErrorDetail;

@Validated
@RestController
@RequestMapping("/recommendations")
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping("/{userId}")
    public RecommendationResponse getRecommendations(
        @PathVariable UUID userId,
        @RequestHeader("X-User-Id") String authenticatedUserId,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        UUID headerUserId = parseHeaderUserId(authenticatedUserId);
        if (!userId.equals(headerUserId)) {
            throw new ApiException("FORBIDDEN", "Authenticated user does not match requested user.", HttpStatus.FORBIDDEN);
        }
        return recommendationService.getRecommendations(userId, limit);
    }

    @GetMapping("/similar/{videoId}")
    public SimilarResponse getSimilarVideos(
        @PathVariable String videoId,
        @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit
    ) {
        return recommendationService.getSimilarVideos(videoId, limit);
    }

    @GetMapping("/cold/{categoryId}")
    public ColdResponse getColdStartByCategory(
        @PathVariable String categoryId,
        @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit
    ) {
        return recommendationService.getColdStartByCategory(categoryId, limit);
    }

    private UUID parseHeaderUserId(String authenticatedUserId) {
        try {
            return UUID.fromString(authenticatedUserId);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(
                "VALIDATION_ERROR",
                "X-User-Id must be a valid UUID.",
                HttpStatus.BAD_REQUEST,
                List.of(new ErrorDetail("X-User-Id", "must be a valid UUID"))
            );
        }
    }
}
