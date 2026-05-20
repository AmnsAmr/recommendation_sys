package org.vidrec.recommendationservice.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RecommendationCacheService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationCacheService.class);
    private static final Duration TTL = Duration.ofMinutes(10);
    private static final TypeReference<List<String>> VIDEO_ID_LIST = new TypeReference<>() {};

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    public RecommendationCacheService(RedisTemplate<String, String> redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public Optional<List<String>> get(UUID userId) {
        String value = redisTemplate.opsForValue().get(key(userId));
        if (value == null) {
            return Optional.empty();
        }

        try {
            return Optional.of(objectMapper.readValue(value, VIDEO_ID_LIST));
        } catch (JsonProcessingException ex) {
            log.warn("Failed to parse recommendation cache for userId={}", userId, ex);
            invalidate(userId);
            return Optional.empty();
        }
    }

    public void put(UUID userId, List<String> videoIds) {
        try {
            redisTemplate.opsForValue().set(key(userId), objectMapper.writeValueAsString(videoIds), TTL);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize recommendation cache for userId={}", userId, ex);
        }
    }

    public void invalidate(UUID userId) {
        redisTemplate.delete(key(userId));
    }

    private String key(UUID userId) {
        return "rec:" + userId;
    }
}
