package org.vidrec.videoservice.kafka.events;

import java.time.Instant;
import java.util.UUID;

public record VideoWatchedEvent(
    String eventId,
    String userId,
    String videoId,
    int watchDuration,
    int videoDuration,
    float completionPct,
    String source,
    String timestamp
) {
    public static VideoWatchedEvent create(
            String userId, String videoId, int watchDuration,
            int videoDuration, float completionPct, String source) {
        return new VideoWatchedEvent(
            UUID.randomUUID().toString(), userId, videoId,
            watchDuration, videoDuration, completionPct, source,
            Instant.now().toString());
    }
}
