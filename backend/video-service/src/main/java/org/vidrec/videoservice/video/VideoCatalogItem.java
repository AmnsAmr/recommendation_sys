package org.vidrec.videoservice.video;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record VideoCatalogItem(
    String videoId,
    String title,
    String categoryId,
    List<String> tags,
    String thumbnailUrl,
    String source,
    String youtubeId,
    Integer duration,
    Long viewCount,
    Long likeCount,
    Long dislikeCount,
    String language,
    UUID uploaderId,
    LocalDateTime createdAt
) {}
