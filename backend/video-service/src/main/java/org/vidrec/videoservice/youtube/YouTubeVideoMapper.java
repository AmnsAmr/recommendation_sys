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

    private final ObjectMapper objectMapper;

    public Video toEntity(YouTubeVideo source) {
        return Video.builder()
            .id(source.youtubeId())
            .title(source.title())
            .description(source.description())
            .categoryId(source.localCategoryId())
            .duration(source.durationSeconds())
            .source(VideoSource.YOUTUBE)
            .youtubeId(source.youtubeId())
            .thumbnailUrl(source.thumbnailUrl())
            .language(source.defaultAudioLanguage())
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
        payload.put("videoId", source.youtubeId());
        payload.put("title", source.title());
        payload.put("description", source.description());
        payload.put("tags", source.tags());
        payload.put("categoryId", source.localCategoryId());
        payload.put("thumbnailUrl", source.thumbnailUrl());
        payload.put("language", source.defaultAudioLanguage());
        payload.put("source", "youtube");
        payload.put("timestamp", Instant.now().toString());
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JacksonException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to serialize video.uploaded payload", ex);
        }
    }
}
