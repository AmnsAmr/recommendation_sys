package org.vidrec.videoservice.video;

import java.time.LocalDateTime;

public record VideoUploadResponse(
    String videoId,
    String status,
    String thumbnailUrl,
    String url,
    LocalDateTime uploadedAt
) {}
