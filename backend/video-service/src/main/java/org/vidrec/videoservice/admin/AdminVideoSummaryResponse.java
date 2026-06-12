package org.vidrec.videoservice.admin;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminVideoSummaryResponse(
    String videoId,
    String title,
    String description,
    UUID uploaderId,
    String status,
    String categoryId,
    Integer duration,
    Long viewCount,
    String source,
    String youtubeId,
    String thumbnailUrl,
    String videoUrl,
    LocalDateTime createdAt
) {}
