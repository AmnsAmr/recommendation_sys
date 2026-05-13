package org.vidrec.videoservice.video;

import java.util.List;

public record VideoListResponse(
    List<VideoResponse> videos,
    int page,
    int size,
    long totalElements
) {}
