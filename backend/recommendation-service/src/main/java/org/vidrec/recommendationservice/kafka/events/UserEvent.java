package org.vidrec.recommendationservice.kafka.events;

import java.util.List;

public record UserEvent(
    String eventId,
    String userId,
    String eventType,
    String username,
    List<String> interests,
    List<String> preferences,
    String reason,
    String timestamp
) {}
