package org.vidrec.videoservice.youtube;

import java.util.List;

public record YouTubeVideo(
    String youtubeId,
    String title,
    String description,
    String thumbnailUrl,
    Integer durationSeconds,
    String defaultAudioLanguage,
    List<String> tags,
    String localCategoryId
) {}
