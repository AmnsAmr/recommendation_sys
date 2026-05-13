package org.vidrec.videoservice.like;

import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/videos")
@RequiredArgsConstructor
public class LikeController {

    private final LikeService likeService;

    @PostMapping("/{videoId}/like")
    public ResponseEntity<LikeResponse> like(
        @PathVariable String videoId,
        @Valid @RequestBody LikeRequest request
    ) {
        UUID userId = authenticatedUserId();
        return ResponseEntity.ok(likeService.recordLike(userId, videoId, request));
    }

    private UUID authenticatedUserId() {
        return UUID.fromString((String) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
    }
}
