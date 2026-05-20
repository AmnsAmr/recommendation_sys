package org.vidrec.recommendationservice.kafka.events;

import java.util.List;

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
) {}
