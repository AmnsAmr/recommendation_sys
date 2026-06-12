package org.vidrec.videoservice.admin;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record AdminVideoDetailResponse(
    String videoId,
    String title,
    String description,
    String categoryId,
    List<String> tags,
    String source,
    String youtubeId,
    UUID uploaderId,
    String thumbnailUrl,
    String videoUrl,
    Integer duration,
    Long viewCount,
    Long likeCount,
    Long dislikeCount,
    String language,
    String status,
    String moderationNotes,
    UUID reviewedBy,
    LocalDateTime reviewedAt,
    LocalDateTime publishedAt,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
