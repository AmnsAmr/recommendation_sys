package org.vidrec.recommendationservice.kafka.events;

public record VideoLikedEvent(
    String eventId,
    String userId,
    String videoId,
    String action,
    String source,
    String timestamp
) {}
