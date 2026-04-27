package org.vidrec.videoservice.youtube;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class YouTubeSyncRunner implements ApplicationRunner {

    private final YouTubeProperties properties;
    private final YouTubeService youTubeService;
    private final YouTubeSyncPersister persister;
    private final YouTubeSyncStateRepository syncStateRepository;

    @Override
    public void run(ApplicationArguments args) {
        runSync();
    }

    @Scheduled(
        fixedDelayString = "${youtube.sync.fixed-delay-ms:86400000}",
        initialDelayString = "${youtube.sync.fixed-delay-ms:86400000}"
    )
    public void scheduledSync() {
        runSync();
    }

    public void runSync() {
        if (!properties.sync().enabled()) {
            log.debug("YouTube sync disabled (youtube.sync.enabled=false), skipping.");
            return;
        }
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            log.warn("YouTube sync skipped: youtube.api-key is not set.");
            return;
        }

        Map<String, String> mappings = parseMappings(properties.sync().categoryMappings());
        if (mappings.isEmpty()) {
            log.warn("YouTube sync skipped: youtube.sync.category-mappings is empty.");
            return;
        }

        log.info("YouTube sync starting for {} category mapping(s).", mappings.size());
        int totalNew = 0;
        try {
            for (Map.Entry<String, String> entry : mappings.entrySet()) {
                String youtubeCategoryId = entry.getKey();
                String localCategoryId = entry.getValue();
                List<YouTubeVideo> videos;
                try {
                    videos = youTubeService.fetchVideosForCategory(youtubeCategoryId, localCategoryId);
                } catch (YouTubeApiException ex) {
                    if (ex.isQuotaExceeded()) {
                        log.warn("YouTube quota exceeded while fetching category {}; aborting this run.",
                            youtubeCategoryId);
                        recordQuotaHit(ex.getMessage());
                        return;
                    }
                    log.error("YouTube fetch failed for category {} (status={}): {}",
                        youtubeCategoryId, ex.getStatusCode(), ex.getMessage());
                    recordError(ex.getMessage());
                    continue;
                }
                totalNew += persister.persistNewVideos(videos);
            }
            recordSuccess();
            log.info("YouTube sync finished. New videos persisted: {}.", totalNew);
        } catch (Exception ex) {
            log.error("YouTube sync failed unexpectedly", ex);
            recordError(ex.getMessage());
        }
    }

    private Map<String, String> parseMappings(String raw) {
        Map<String, String> result = new LinkedHashMap<>();
        if (raw == null || raw.isBlank()) return result;
        for (String pair : raw.split(",")) {
            String[] parts = pair.split(":", 2);
            if (parts.length != 2) continue;
            String key = parts[0].trim();
            String value = parts[1].trim();
            if (!key.isEmpty() && !value.isEmpty()) {
                result.put(key, value);
            }
        }
        return result;
    }

    private void recordSuccess() {
        YouTubeSyncState state = loadOrInit();
        state.setLastSuccessfulRunAt(LocalDateTime.now());
        state.setLastError(null);
        syncStateRepository.save(state);
    }

    private void recordQuotaHit(String message) {
        YouTubeSyncState state = loadOrInit();
        state.setLastQuotaHitAt(LocalDateTime.now());
        state.setLastError(truncate(message, 1000));
        syncStateRepository.save(state);
    }

    private void recordError(String message) {
        YouTubeSyncState state = loadOrInit();
        state.setLastError(truncate(message, 1000));
        syncStateRepository.save(state);
    }

    private YouTubeSyncState loadOrInit() {
        return syncStateRepository.findById(YouTubeSyncState.SINGLETON_ID)
            .orElseGet(() -> YouTubeSyncState.builder()
                .id(YouTubeSyncState.SINGLETON_ID)
                .build());
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
