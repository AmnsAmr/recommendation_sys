package org.vidrec.videoservice.youtube;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/videos/youtube")
@RequiredArgsConstructor
public class YouTubeController {

    private final YouTubeService youTubeService;
    private final YouTubeProperties properties;

    @GetMapping("/search")
    public ResponseEntity<YouTubeSearchResponse> search(
        @RequestParam(defaultValue = "programming tutorials") String q,
        @RequestParam(defaultValue = "12") int maxResults
    ) {
        if (!StringUtils.hasText(properties.apiKey())) {
            return ResponseEntity.ok(new YouTubeSearchResponse(List.of()));
        }

        return ResponseEntity.ok(new YouTubeSearchResponse(youTubeService.searchVideos(q, maxResults)));
    }
}
