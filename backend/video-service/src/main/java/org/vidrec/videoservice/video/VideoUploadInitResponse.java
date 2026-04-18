package org.vidrec.videoservice.video;

import java.time.LocalDateTime;

public record VideoUploadInitResponse(
    String videoId,
    String uploadToken,
    LocalDateTime expiresAt
) {}
