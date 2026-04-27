package org.vidrec.videoservice.youtube;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.web.client.RestClient;

@Configuration
@EnableRetry
@EnableConfigurationProperties(YouTubeProperties.class)
public class YouTubeConfig {

    private static final String YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

    @Bean
    public RestClient youTubeRestClient() {
        return RestClient.builder()
            .baseUrl(YOUTUBE_API_BASE)
            .build();
    }
}
