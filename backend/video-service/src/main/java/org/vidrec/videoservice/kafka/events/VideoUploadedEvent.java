package org.vidrec.videoservice.kafka.events;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record VideoUploadedEvent(
    String eventId,
    String videoId,
    String title,
    String description,
    List<String> tags,
    String categoryId,
    String thumbnailUrl,
    String language,
    String source,
    String timestamp
) {
    public static VideoUploadedEvent create(
            String videoId, String title, String description,
            List<String> tags, String categoryId, String thumbnailUrl,
            String language, String source) {
        return new VideoUploadedEvent(
            UUID.randomUUID().toString(), videoId, title, description,
            tags, categoryId, thumbnailUrl, language, source,
            Instant.now().toString());
    }
}
