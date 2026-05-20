# AGENT.md -- recommendation-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Consumes Kafka topics and maintains the hybrid recommendation engine.
Produces personalized feeds using SVD (sidecar-trained) + content-based similarity.
Caches results in Redis. Handles cold start for new users.

---

## Current Implementation State

- [x] Project scaffold (Spring Boot, dependencies, application.properties)
- [x] Kafka consumers for all topics
- [x] Idempotency via processed_events
- [x] Interactions table insert on every event
- [x] Item factors update on video.uploaded and video.watched
- [x] User category profile insert on user.events (registered)
- [x] Handle user.events (prefs_updated, deactivated)
- [x] Content-based engine (cosine similarity)
- [x] Hybrid scorer (SVD + content)
- [x] Cold start logic (declared interests)
- [x] Redis cache (get/set/invalidate)
- [x] GET /recommendations/{userId}
- [x] GET /recommendations/similar/{videoId}
- [x] GET /recommendations/cold/{categoryId}

---

## Package Structure (target)

```
org.vidrec.recommendationservice
  |-- recommendation/
  |   |-- RecommendationController.java
  |   |-- RecommendationService.java
  |   |-- RecommendationResponse.java
  |   `-- HybridScorer.java
  |-- interaction/
  |   |-- Interaction.java
  |   |-- InteractionRepository.java
  |   `-- EventType.java
  |-- model/
  |   |-- UserFactor.java
  |   |-- ItemFactor.java
  |   |-- UserCategoryProfile.java
  |   `-- ProcessedEvent.java
  |-- content/
  |   `-- ContentBasedService.java
  |-- cache/
  |   `-- RecommendationCacheService.java
  |-- kafka/
  |   |-- RecommendationEventConsumer.java
  |   `-- events/
  |       |-- VideoWatchedEvent.java
  |       |-- VideoLikedEvent.java
  |       |-- UserSearchedEvent.java
  |       |-- VideoUploadedEvent.java
  |       `-- UserEvent.java
  `-- config/
      |-- KafkaConfig.java
      `-- RedisConfig.java
```

---

## Key Business Rules

1. Score mapping is exact (see root AGENT.md).
2. Cold start threshold = 5 interactions.
3. Hybrid weights: SVD=0.6, Content=0.4 (normalize to [0,1]).
4. Redis key: `rec:{userId}`, TTL 10 minutes. Invalidate on new interaction.
5. video.uploaded builds content index only (no cache invalidation).
6. Idempotency: if eventId already exists in processed_events, skip.
7. item_factors includes thumbnail_url and language for cold start + similar videos.
8. user.events:
   - registered: insert user_category_profiles (source=declared)
   - prefs_updated: replace user_category_profiles (source=declared)
   - deactivated / banned / deleted: invalidate cache for userId
9. Only admin-approved platform uploads should ever reach recommendation-service as `video.uploaded`.

---

## Files to Read First

1. `kafka/events/VideoWatchedEvent.java`
2. `interaction/Interaction.java`
3. `content/ContentBasedService.java`
4. `recommendation/RecommendationService.java`
5. `cache/RecommendationCacheService.java`

---

## Known Issues / TODOs

- Full SVD training is externalized to FastAPI sidecar (not wired in Java yet).
- No batch backfill of item_factors for legacy videos.
- DLQ handling implemented with `*.dlq` topic routing.
- Personalized feed currently returns cold-start-by-user for new users and a content-based fallback for users with more interactions; SVD/hybrid scoring is not wired into the controller yet.
