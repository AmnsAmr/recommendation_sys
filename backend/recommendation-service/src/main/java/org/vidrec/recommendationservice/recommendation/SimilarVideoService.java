package org.vidrec.recommendationservice.recommendation;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.vidrec.recommendationservice.content.ContentBasedService;
import org.vidrec.recommendationservice.model.ItemFactorRepository;

@Service
@RequiredArgsConstructor
public class SimilarVideoService {

    private final ItemFactorRepository itemFactorRepository;
    private final ContentBasedService contentBasedService;

    @Transactional(readOnly = true)
    public SimilarVideosResponse getSimilarVideos(String videoId, int limit) {
        if (!itemFactorRepository.existsById(videoId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND");
        }

        return new SimilarVideosResponse(
                videoId,
                contentBasedService.getSimilarItems(videoId, limit),
                LocalDateTime.now());
    }
}
