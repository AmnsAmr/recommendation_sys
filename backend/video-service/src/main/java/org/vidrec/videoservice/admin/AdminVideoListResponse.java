package org.vidrec.videoservice.admin;

import java.util.List;

public record AdminVideoListResponse(
    List<AdminVideoSummaryResponse> videos,
    int page,
    int size,
    long totalElements
) {}
