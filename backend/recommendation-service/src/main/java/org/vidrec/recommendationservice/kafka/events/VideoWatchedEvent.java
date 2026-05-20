package org.vidrec.recommendationservice.kafka.events;

import java.util.List;

public record VideoWatchedEvent(
    String eventId,
    String userId,
    String videoId,
    int watchDuration,
    int videoDuration,
    double completionPct,
    String source,
    String timestamp
) {}
