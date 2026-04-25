package org.vidrec.videoservice.video;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record VideoResponse(
    String videoId,
    String title,
    String description,
    String categoryId,
    List<String> tags,
    String source,
    String youtubeId,
    String url,
    String thumbnailUrl,
    Integer duration,
    Long viewCount,
    Long likeCount,
    Long dislikeCount,
    String language,
    UUID uploaderId,
    String status,
    LocalDateTime createdAt
) {}
