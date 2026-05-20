package org.vidrec.recommendationservice.recommendation;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Slf4j
@Service
public class SvdClient {

    private final RestClient restClient;

    public SvdClient(@Value("${SVD_SIDECAR_URL:${svd.sidecar.url:http://svd-sidecar:8000}}") String sidecarUrl) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(2));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder()
            .baseUrl(sidecarUrl)
            .requestFactory(requestFactory)
            .build();
    }

    public Map<String, Double> predictBatch(String userId, List<String> videoIds) {
        if (videoIds.isEmpty()) {
            return Map.of();
        }

        try {
            PredictBatchResponse response = restClient.post()
                .uri("/predict/batch")
                .body(new PredictBatchRequest(userId, videoIds))
                .retrieve()
                .body(PredictBatchResponse.class);

            Map<String, Double> scores = zeroScores(videoIds);
            if (response != null && response.scores() != null) {
                response.scores().forEach(score -> scores.put(score.videoId(), score.score()));
            }
            return scores;
        } catch (Exception ex) {
            log.warn("SVD sidecar unavailable; falling back to zero SVD scores for userId={}", userId, ex);
            return zeroScores(videoIds);
        }
    }

    private Map<String, Double> zeroScores(List<String> videoIds) {
        Map<String, Double> scores = new HashMap<>();
        videoIds.forEach(videoId -> scores.put(videoId, 0.0));
        return scores;
    }

    private record PredictBatchRequest(String userId, List<String> videoIds) {}

    private record PredictBatchResponse(List<PredictScore> scores) {}

    private record PredictScore(String videoId, Double score) {}
}
