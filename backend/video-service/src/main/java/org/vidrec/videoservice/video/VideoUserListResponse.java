package org.vidrec.videoservice.video;

import java.util.List;

public record VideoUserListResponse(
    List<VideoUserListItem> videos,
    int page,
    int size,
    long totalElements
) {}
