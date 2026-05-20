package org.vidrec.recommendationservice.kafka.events;

import java.util.List;

public record UserSearchedEvent(
    String eventId,
    String userId,
    String query,
    List<String> resultVideoIds,
    String clickedVideoId,
    String timestamp
) {}
