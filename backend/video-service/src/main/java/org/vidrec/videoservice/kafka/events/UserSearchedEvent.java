package org.vidrec.videoservice.kafka.events;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserSearchedEvent(
    String eventId,
    String userId,
    String query,
    List<String> resultVideoIds,
    String clickedVideoId,
    String timestamp
) {
    public static UserSearchedEvent create(
            String userId, String query, List<String> resultVideoIds,
            String clickedVideoId) {
        return new UserSearchedEvent(
            UUID.randomUUID().toString(), userId, query,
            resultVideoIds, clickedVideoId, Instant.now().toString());
    }
}
