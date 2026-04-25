package org.vidrec.videoservice.video;

import java.time.LocalDateTime;
import java.util.List;

public record VideoSearchItem(
    String videoId,
    String title,
    String categoryId,
    List<String> tags,
    String thumbnailUrl,
    Integer duration,
    Long viewCount,
    Long likeCount,
    String language,
    String source,
    LocalDateTime createdAt
) {}
