package org.vidrec.videoservice.admin;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminVideoSummaryResponse(
    String videoId,
    String title,
    UUID uploaderId,
    String status,
    String thumbnailUrl,
    LocalDateTime createdAt
) {}
