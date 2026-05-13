package org.vidrec.videoservice.video;

import java.util.List;

public record VideoCatalogResponse(
    List<VideoCatalogItem> videos,
    int page,
    int size,
    long totalElements
) {}
