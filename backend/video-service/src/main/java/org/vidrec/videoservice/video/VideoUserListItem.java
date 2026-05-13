package org.vidrec.videoservice.video;

import java.time.LocalDateTime;
import java.util.List;

public record VideoUserListItem(
    String videoId,
    String title,
    String categoryId,
    List<String> tags,
    String thumbnailUrl,
    Integer duration,
    Long viewCount,
    Long likeCount,
    Long dislikeCount,
    String language,
    String status,
    LocalDateTime createdAt
) {}
