package org.vidrec.videoservice.video;

import java.util.List;

public record VideoSearchResponse(
    String query,
    List<VideoSearchItem> videos,
    int page,
    int size,
    long totalElements
) {}
