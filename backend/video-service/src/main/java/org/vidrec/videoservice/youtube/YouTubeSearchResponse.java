package org.vidrec.videoservice.youtube;

import java.util.List;

public record YouTubeSearchResponse(
    List<YouTubeVideo> videos
) {}
