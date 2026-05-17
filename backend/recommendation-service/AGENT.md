# AGENT.md -- recommendation-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Will consume Kafka topics produced by user-service and video-service and serve the hybrid
recommendation feed (SVD via sidecar + content-based cosine similarity), with Redis caching and
cold-start handling for new users.

**Today this service is the least-built one in the platform.** Persistence, security, and
configuration scaffolding are in place; the actual business logic (consumers, controllers, scoring,
cache) has not been implemented yet.

---

## Current Implementation State

### Implemented

- [x] Project scaffold (Spring Boot 4.0.5, JPA, WebMVC, Security, Validation, Data Redis, Kafka, Postgres driver)
- [x] `.env` loader -- `config/DotenvEnvironmentListener`
- [x] Entities + repositories for the recommendation schema:
      - `interaction/Interaction` + `InteractionRepository`, `EventType` enum (watch / like / dislike / search_click / rewatch)
      - `model/UserFactor` + repo (SVD user vector)
      - `model/ItemFactor` + repo (SVD item vector + tags / category / language / thumbnail / view_count / global_score)
      - `model/UserCategoryProfile` + repo (declared / inferred category weights)
      - `model/ProcessedEvent` + repo (eventId dedup table)
- [x] Security: `HeaderAuthFilter` enforces `X-Internal-Token`; `/recommendations/cold/**` and `/recommendations/similar/**` allowed unauthenticated; everything else authenticated
- [x] Kafka client config in `application.properties` (SASL_SSL + PLAIN, `KAFKA_SASL_USERNAME` / `KAFKA_SASL_PASSWORD`)
- [x] Redis client config in `application.properties` (`REDIS_HOST` / `REDIS_PORT`)
- [x] SVD sidecar URL config (`svd.sidecar.url` <- `SVD_SIDECAR_URL`)

### Not implemented

- [ ] `recommendation/RecommendationController` (`GET /recommendations/{userId}`, `/similar/{videoId}`, `/cold/{categoryId}`)
- [ ] `recommendation/RecommendationService` + hybrid scorer (`final = 0.6*svd + 0.4*content`)
- [ ] `content/ContentBasedService` (cosine similarity on tags / category / language)
- [ ] `cache/RecommendationCacheService` (Redis `rec:{userId}` get/set/invalidate, TTL 10 min)
- [ ] `kafka/RecommendationEventConsumer` for `video.watched`, `video.liked`, `user.searched`, `video.uploaded`, `user.events`
- [ ] Idempotency check using `ProcessedEvent` before processing any event
- [ ] Interaction insert + score mapping per RULES.md §3 (watch by completion pct, like +1, dislike -1, search_click +0.5)
- [ ] `item_factors` upsert on `video.uploaded` and `video.watched`
- [ ] `user_category_profiles` insert/replace on `user.events` (registered / prefs_updated)
- [ ] Cache invalidation on `user.events` (deactivated / banned / deleted) and on any new interaction
- [ ] HTTP/gRPC client to `svd-sidecar` for training and inference
- [ ] DLQ handling for poison messages
- [ ] No `kafka/events/` payload records exist yet
- [ ] No Redis or Kafka config classes exist yet (relying purely on Spring Boot auto-config + properties)

---

## Package Structure (actual)

```
org.vidrec.recommendationservice
  |-- RecommendationServiceApplication.java
  |-- config/
  |   `-- DotenvEnvironmentListener.java
  |-- interaction/
  |   |-- EventType.java
  |   |-- Interaction.java
  |   `-- InteractionRepository.java
  |-- model/
  |   |-- UserFactor.java
  |   |-- UserFactorRepository.java
  |   |-- ItemFactor.java
  |   |-- ItemFactorRepository.java
  |   |-- UserCategoryProfile.java
  |   |-- UserCategoryProfileRepository.java
  |   |-- ProcessedEvent.java
  |   `-- ProcessedEventRepository.java
  `-- security/
      |-- SecurityConfig.java
      |-- HeaderAuthFilter.java
      `-- UserRole.java
```

---

## Package Structure (target -- when implementation lands)

```
org.vidrec.recommendationservice
  |-- recommendation/
  |   |-- RecommendationController.java
  |   |-- RecommendationService.java
  |   |-- RecommendationResponse.java
  |   `-- HybridScorer.java
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

(The `interaction/`, `model/`, `security/` packages stay as they are.)

---

## Key Business Rules (apply when implementing)

1. Score mapping is exact (see root AGENT.md §"Signal to Score Mapping").
2. Cold-start threshold = 5 interactions.
3. Hybrid weights: SVD = 0.6, content = 0.4; both normalized to `[0, 1]` before combining.
4. Redis key: `rec:{userId}`; value = JSON array of videoIds; TTL = 10 minutes; invalidate on every new interaction for that user.
5. `video.uploaded` builds the content index only (do **not** invalidate the recommendation cache).
6. Idempotency: every consumer must check `ProcessedEvent` by `eventId` before processing and insert a row after success.
7. `item_factors` includes `thumbnailUrl` and `language` so cold-start and similar-video endpoints can render without extra HTTP calls.
8. `user.events` handling:
   - `registered`: insert `user_category_profiles` with `source=declared`
   - `prefs_updated`: replace `user_category_profiles` with `source=declared`
   - `deactivated` / `banned` / `deleted`: invalidate `rec:{userId}` cache
9. Only admin-approved OWN videos should ever arrive as `video.uploaded` (video-service guarantees this by only publishing on approve).
10. Every Kafka consumer must wrap processing in try/catch, log the full payload on failure, and not crash.

---

## Files to Read First (when implementation lands)

1. `kafka/RecommendationEventConsumer.java` (when created)
2. `recommendation/RecommendationService.java` (when created)
3. `interaction/Interaction.java`
4. `model/ItemFactor.java`
5. `cache/RecommendationCacheService.java` (when created)

For now, the only meaningful files to read are the entities and the security filter.

---

## Known Issues / TODOs

- Everything in the "Not implemented" section above.
- Full SVD training is delegated to the FastAPI sidecar (see `backend/svd-sidecar/`); the Java client is not yet wired.
- No batch backfill job for `item_factors` over legacy videos.
- No DLQ for poison messages.
- No tests beyond the default context-load test.
