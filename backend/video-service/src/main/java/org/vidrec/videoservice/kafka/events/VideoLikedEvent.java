package org.vidrec.videoservice.kafka.events;

import java.time.Instant;
import java.util.UUID;

public record VideoLikedEvent(
    String eventId,
    String userId,
    String videoId,
    String action,
    String source,
    String timestamp
) {
    public static VideoLikedEvent create(
            String userId, String videoId, String action, String source) {
        return new VideoLikedEvent(
            UUID.randomUUID().toString(), userId, videoId,
            action, source, Instant.now().toString());
    }
}
