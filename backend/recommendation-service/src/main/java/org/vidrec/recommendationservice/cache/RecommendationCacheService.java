package org.vidrec.recommendationservice.cache;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationCacheService {

    private static final String CACHE_PREFIX = "rec:hybrid:";
    private static final String LEGACY_CACHE_PREFIX = "rec:";
    private static final Duration TTL = Duration.ofMinutes(10);
    private static final TypeReference<List<String>> VIDEO_ID_LIST = new TypeReference<>() {};

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public Optional<List<String>> get(UUID userId) {
        String value = redisTemplate.opsForValue().get(key(userId));
        if (value == null) {
            return Optional.empty();
        }

        try {
            return Optional.of(objectMapper.readValue(value, VIDEO_ID_LIST));
        } catch (RuntimeException ex) {
            log.warn("Failed to parse recommendation cache for user={}", userId, ex);
            invalidate(userId);
            return Optional.empty();
        }
    }

    public void put(UUID userId, List<String> videoIds) {
        try {
            redisTemplate.opsForValue().set(key(userId), objectMapper.writeValueAsString(videoIds), TTL);
        } catch (RuntimeException ex) {
            log.warn("Failed to serialize recommendation cache for user={}", userId, ex);
        }
    }

    public void invalidate(UUID userId) {
        try {
            redisTemplate.delete(key(userId));
            redisTemplate.delete(legacyKey(userId));
            log.info("Invalidated cache for user={}", userId);
        } catch (RuntimeException ex) {
            log.error("Failed to invalidate cache for user={}", userId, ex);
        }
    }

    private String key(UUID userId) {
        return CACHE_PREFIX + userId.toString();
    }

    private String legacyKey(UUID userId) {
        return LEGACY_CACHE_PREFIX + userId.toString();
    }
}
