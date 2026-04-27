package org.vidrec.videoservice.youtube;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "youtube")
public record YouTubeProperties(
    String apiKey,
    Sync sync
) {
    public record Sync(
        boolean enabled,
        String regionCode,
        int maxResults,
        long fixedDelayMs,
        String categoryMappings
    ) {}
}
