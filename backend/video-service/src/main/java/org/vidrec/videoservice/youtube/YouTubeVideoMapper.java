package org.vidrec.videoservice.youtube;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.vidrec.videoservice.video.Video;
import org.vidrec.videoservice.video.VideoSource;
import org.vidrec.videoservice.video.VideoStatus;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
public class YouTubeVideoMapper {

    private static final int LEGACY_VARCHAR_LIMIT = 255;
    private static final int LANGUAGE_LENGTH = 10;

    private final ObjectMapper objectMapper;

    public Video toEntity(YouTubeVideo source) {
        return Video.builder()
            .id(source.youtubeId())
            .title(fit(source.title(), LEGACY_VARCHAR_LIMIT))
            .description(fit(source.description(), LEGACY_VARCHAR_LIMIT))
            .categoryId(fit(source.localCategoryId(), LEGACY_VARCHAR_LIMIT))
            .duration(source.durationSeconds())
            .source(VideoSource.YOUTUBE)
            .youtubeId(fit(source.youtubeId(), 100))
            .thumbnailUrl(fit(source.thumbnailUrl(), LEGACY_VARCHAR_LIMIT))
            .language(fit(source.defaultAudioLanguage(), LANGUAGE_LENGTH))
            .status(VideoStatus.READY)
            .viewCount(0L)
            .likeCount(0L)
            .dislikeCount(0L)
            .publishedAt(LocalDateTime.now())
            .build();
    }

    public String toUploadedPayload(YouTubeVideo source) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventId", UUID.randomUUID().toString());
        payload.put("videoId", fit(source.youtubeId(), 100));
        payload.put("title", fit(source.title(), LEGACY_VARCHAR_LIMIT));
        payload.put("description", fit(source.description(), LEGACY_VARCHAR_LIMIT));
        payload.put("tags", source.tags());
        payload.put("categoryId", fit(source.localCategoryId(), LEGACY_VARCHAR_LIMIT));
        payload.put("thumbnailUrl", fit(source.thumbnailUrl(), LEGACY_VARCHAR_LIMIT));
        payload.put("language", fit(source.defaultAudioLanguage(), LANGUAGE_LENGTH));
        payload.put("source", "youtube");
        payload.put("timestamp", Instant.now().toString());
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JacksonException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to serialize video.uploaded payload", ex);
        }
    }

    private String fit(String value, int maxLength) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength);
    }
}
