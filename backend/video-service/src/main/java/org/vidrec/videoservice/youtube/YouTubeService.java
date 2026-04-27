package org.vidrec.videoservice.youtube;

import java.io.IOException;
import java.time.Duration;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Service
@RequiredArgsConstructor
public class YouTubeService {

    private final RestClient youTubeRestClient;
    private final YouTubeProperties properties;
    private final ObjectMapper objectMapper;

    public List<YouTubeVideo> fetchVideosForCategory(String youtubeCategoryId, String localCategoryId) {
        List<String> ids = searchVideoIds(youtubeCategoryId);
        if (ids.isEmpty()) {
            return List.of();
        }
        return fetchVideoDetails(ids, localCategoryId);
    }

    private List<String> searchVideoIds(String youtubeCategoryId) {
        String body = callApi("/search", uri -> uri
            .queryParam("part", "snippet")
            .queryParam("type", "video")
            .queryParam("videoCategoryId", youtubeCategoryId)
            .queryParam("regionCode", properties.sync().regionCode())
            .queryParam("maxResults", properties.sync().maxResults())
            .queryParam("key", properties.apiKey()));

        JsonNode root = parse(body);
        List<String> ids = new ArrayList<>();
        for (JsonNode item : root.path("items")) {
            String id = item.path("id").path("videoId").asText("");
            if (!id.isEmpty()) {
                ids.add(id);
            }
        }
        return ids;
    }

    private List<YouTubeVideo> fetchVideoDetails(List<String> ids, String localCategoryId) {
        String body = callApi("/videos", uri -> uri
            .queryParam("part", "snippet,contentDetails")
            .queryParam("id", String.join(",", ids))
            .queryParam("key", properties.apiKey()));

        JsonNode root = parse(body);
        List<YouTubeVideo> videos = new ArrayList<>();
        for (JsonNode item : root.path("items")) {
            String id = item.path("id").asText("");
            if (id.isEmpty()) continue;
            JsonNode snippet = item.path("snippet");
            JsonNode contentDetails = item.path("contentDetails");
            videos.add(new YouTubeVideo(
                id,
                snippet.path("title").asText(""),
                snippet.path("description").asText(""),
                pickThumbnail(snippet.path("thumbnails")),
                parseIso8601Seconds(contentDetails.path("duration").asText("")),
                snippet.path("defaultAudioLanguage").asText("en"),
                extractTags(snippet.path("tags")),
                localCategoryId
            ));
        }
        return videos;
    }

    @Retryable(
        retryFor = YouTubeTransientException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 2.0)
    )
    String callApi(String path, java.util.function.Consumer<org.springframework.web.util.UriBuilder> uriCustomizer) {
        try {
            return youTubeRestClient.get()
                .uri(uri -> {
                    uri.path(path);
                    uriCustomizer.accept(uri);
                    return uri.build();
                })
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, res) -> {
                    String responseBody = readBody(res.getBody());
                    int code = res.getStatusCode().value();
                    if (code == 403 && isQuotaExceeded(responseBody)) {
                        throw new YouTubeApiException(code, true,
                            "YouTube quota exceeded: " + truncate(responseBody, 500));
                    }
                    if (code >= 500 || code == 429) {
                        throw new YouTubeTransientException(code,
                            "YouTube transient error: " + truncate(responseBody, 500), null);
                    }
                    throw new YouTubeApiException(code, false,
                        "YouTube API error: " + truncate(responseBody, 500));
                })
                .body(String.class);
        } catch (ResourceAccessException ex) {
            throw new YouTubeTransientException(0, "YouTube network error: " + ex.getMessage(), ex);
        }
    }

    private JsonNode parse(String body) {
        try {
            return objectMapper.readTree(body == null ? "{}" : body);
        } catch (JacksonException ex) {
            throw new YouTubeApiException(0, false, "Failed to parse YouTube response", ex);
        }
    }

    private boolean isQuotaExceeded(String body) {
        if (body == null || body.isBlank()) return false;
        try {
            JsonNode root = objectMapper.readTree(body);
            for (JsonNode err : root.path("error").path("errors")) {
                String reason = err.path("reason").asText("");
                if ("quotaExceeded".equals(reason) || "rateLimitExceeded".equals(reason)) {
                    return true;
                }
            }
        } catch (JacksonException ignored) {
            // fall through
        }
        return body.contains("quotaExceeded") || body.contains("rateLimitExceeded");
    }

    private String pickThumbnail(JsonNode thumbnails) {
        for (String quality : List.of("high", "medium", "default")) {
            String url = thumbnails.path(quality).path("url").asText("");
            if (!url.isEmpty()) return url;
        }
        return null;
    }

    private List<String> extractTags(JsonNode tagsNode) {
        if (!tagsNode.isArray()) return List.of();
        List<String> tags = new ArrayList<>();
        tagsNode.forEach(t -> tags.add(t.asText("")));
        return Collections.unmodifiableList(tags);
    }

    private Integer parseIso8601Seconds(String iso) {
        if (iso == null || iso.isBlank()) return null;
        try {
            return Math.toIntExact(Duration.parse(iso).toSeconds());
        } catch (DateTimeParseException | ArithmeticException ex) {
            log.warn("Could not parse YouTube duration '{}': {}", iso, ex.getMessage());
            return null;
        }
    }

    private String readBody(java.io.InputStream stream) {
        if (stream == null) return "";
        try {
            return new String(stream.readAllBytes());
        } catch (IOException ex) {
            return "";
        }
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}
