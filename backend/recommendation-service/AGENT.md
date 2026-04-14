# AGENT.md -- recommendation-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Consumes Kafka topics and maintains the hybrid recommendation engine.
Produces personalized feeds using SVD (sidecar-trained) + content-based similarity.
Caches results in Redis. Handles cold start for new users.

---

## Current Implementation State

- [ ] Project scaffold (Spring Boot, dependencies, application.properties)
- [ ] Kafka consumers for all topics
- [ ] Idempotency via processed_events
- [ ] Interactions table insert on every event
- [ ] Item factors update on video.uploaded and video.watched
- [ ] User category profile insert on user.events (registered)
- [ ] Handle user.events (prefs_updated, deactivated)
- [ ] Content-based engine (cosine similarity)
- [ ] Hybrid scorer (SVD + content)
- [ ] Cold start logic (declared interests)
- [ ] Redis cache (get/set/invalidate)
- [ ] GET /recommendations/{userId}
- [ ] GET /recommendations/similar/{videoId}
- [ ] GET /recommendations/cold/{categoryId}

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
   - deactivated: invalidate cache for userId

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
- DLQ handling not implemented yet.
