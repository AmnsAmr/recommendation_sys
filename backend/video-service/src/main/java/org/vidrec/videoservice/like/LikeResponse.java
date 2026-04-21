package org.vidrec.videoservice.like;

import java.time.LocalDateTime;

public record LikeResponse(
    String videoId,
    String action,
    Long likeCount,
    Long dislikeCount,
    LocalDateTime recordedAt
) {}
