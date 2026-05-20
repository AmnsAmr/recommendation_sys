package org.vidrec.recommendationservice.cache;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationCacheService {

    private final StringRedisTemplate redisTemplate;
    private static final String CACHE_PREFIX = "rec:";

    public void invalidate(UUID userId) {
        String key = CACHE_PREFIX + userId.toString();
        try {
            redisTemplate.delete(key);
            log.info("Invalidated cache for user={}", userId);
        } catch (Exception e) {
            log.error("Failed to invalidate cache for user={}", userId, e);
        }
    }
}
