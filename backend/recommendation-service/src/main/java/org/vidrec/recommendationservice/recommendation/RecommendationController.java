package org.vidrec.recommendationservice.recommendation;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final SimilarVideoService similarVideoService;
    private final ColdStartService coldStartService;
    private final RecommendationService recommendationService;

    @Value("${app.security.disabled:true}")
    private boolean securityDisabled;

    @GetMapping("/{userId}")
    public ResponseEntity<RecommendationResponse> getRecommendations(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "20") int limit,
            Authentication authentication) {
        enforceAccess(userId, authentication);
        return ResponseEntity.ok(recommendationService.getRecommendations(userId, limit));
    }

    @GetMapping("/similar/{videoId}")
    public ResponseEntity<SimilarVideosResponse> getSimilarVideos(
            @PathVariable String videoId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(similarVideoService.getSimilarVideos(videoId, limit));
    }

    @GetMapping("/cold/{categoryId}")
    public ResponseEntity<ColdStartRecommendationsResponse> getColdByCategory(
            @PathVariable String categoryId,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(new ColdStartRecommendationsResponse(
                categoryId,
                coldStartService.getColdByCategory(categoryId, limit),
                LocalDateTime.now()));
    }

    private void enforceAccess(UUID requestedUserId, Authentication authentication) {
        if (securityDisabled) {
            // FIXME(RULES.md §4): test mode bypasses per-user recommendation authorization for local verification.
            return;
        }

        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }

        String authenticatedUserId = String.valueOf(authentication.getPrincipal());
        boolean admin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        if (!admin && !requestedUserId.toString().equals(authenticatedUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
    }
}
