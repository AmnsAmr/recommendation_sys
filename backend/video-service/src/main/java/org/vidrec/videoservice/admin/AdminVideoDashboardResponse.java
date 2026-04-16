package org.vidrec.videoservice.admin;

public record AdminVideoDashboardResponse(
    long totalVideos,
    long publicVideos,
    long pendingReviewVideos,
    long rejectedVideos,
    long youtubeVideos,
    long platformVideos,
    long uploadsLast7Days,
    long totalViews
) {}
