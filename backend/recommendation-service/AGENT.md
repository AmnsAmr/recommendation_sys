# AGENT.md -- recommendation-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Consumes Kafka topics produced by user-service and video-service and serves the hybrid recommendation
feed (SVD via sidecar + content-based cosine similarity), with Redis caching and cold-start handling
for new users.

Today the content engine, cold-start (by category and by declared user preferences), and similar-video
endpoints are wired through `RecommendationController`. The Kafka ingestion path, Redis cache, hybrid
scorer, SVD client, and the JWT-protected `/recommendations/{userId}` endpoint are still pending.

---

## Current Implementation State

### Implemented

- [x] Project scaffold (Spring Boot 4.0.5, JPA, WebMVC, Security, Validation, Data Redis, Kafka, Postgres driver)
- [x] `.env` loader -- `config/DotenvEnvironmentListener`
- [x] Entities + repositories for the recommendation schema:
      - `interaction/Interaction` + `InteractionRepository` (`countByUserId`, `findByUserId`, `findByVideoId`, `findByUserIdAndVideoId`), `EventType` enum (watch / like / dislike / search_click / rewatch)
      - `model/UserFactor` + repo -- schema: `userId` (UUID PK), `vector` (FLOAT[]), `interactionCount` (INTEGER not null default 0), `lastTrainedAt` (nullable), `updatedAt`
      - `model/ItemFactor` + repo (`findByVideoId`, `findByCategoryId`, `findAllByVideoIdIn`, `findAllByCategoryIdOrderByGlobalScoreDesc`) -- vector + tags + categoryId + thumbnailUrl + language + viewCount + globalScore
      - `model/UserCategoryProfile` + repo (`findByUserId`, `findByUserIdAndSource`, `deleteByUserId`, `deleteByUserIdAndSource`)
      - `model/ProcessedEvent` + repo (`existsByEventId`) -- idempotency table
- [x] Security: `HeaderAuthFilter` verifies `X-Internal-Token`, sets `Authentication.principal = userId` (String); `/recommendations/cold/**` and `/recommendations/similar/**` allowed unauthenticated; everything else authenticated
- [x] Kafka client config in `application.properties` (SASL_SSL + PLAIN, `KAFKA_SASL_USERNAME` / `KAFKA_SASL_PASSWORD`)
- [x] Redis client config in `application.properties` (`spring.data.redis.host` / `spring.data.redis.port`) -- Spring Boot auto-config provides `StringRedisTemplate`
- [x] SVD sidecar URL config (`svd.sidecar.url` <- `SVD_SIDECAR_URL`, default `http://svd-sidecar:8000`)
- [x] `content/ContentVectorizer` + `content/ContentBasedService` -- cosine similarity over tags / category / language; `scoreCandidates(userId, candidates) -> Map<videoId, score>` and `getSimilarItems(videoId, limit)`
- [x] `model/ItemFactorService` -- `upsert` on `video.uploaded`, `incrementViewCount` + global_score recompute on `video.watched`
- [x] `model/UserCategoryProfileService` -- `insertDeclared` on `registered`, `replaceDeclared` on `prefs_updated` (deletes only `source=declared` rows)
- [x] `recommendation/SimilarVideoService` -- 404 `VIDEO_NOT_FOUND` if no `item_factors` row, otherwise ranked similar `videoId` list
- [x] `recommendation/ColdStartService.getColdByCategory(categoryId, limit)` -- top-N by `globalScore` DESC
- [x] `recommendation/ColdStartService.getColdByUser(userId, limit)` -- declared-weight × content-score; throws `422 NO_PREFERENCES` if no declared rows
- [x] `recommendation/RecommendationController` -- exposes `GET /recommendations/similar/{videoId}` and `GET /recommendations/cold/{categoryId}` (cold-by-user lives in the service but no controller route yet)

### Not implemented

- [ ] `GET /recommendations/{userId}` route on `RecommendationController` (cold/hybrid switch at 5-interaction threshold; JWT subject vs path `userId` 403 check)
- [ ] `recommendation/RecommendationService` (strategy router around `ColdStartService.getColdByUser` and `HybridScorer`)
- [ ] `recommendation/HybridScorer` (`final = 0.6*svd + 0.4*content`, both min-max normalized to `[0,1]`)
- [ ] `recommendation/SvdClient` -- Spring 4.x `RestClient` to `${svd.sidecar.url}/predict/batch`, 2 s connect / 5 s read timeout, return `0.0` for all on failure (graceful degradation)
- [ ] `recommendation/RecommendationResponse` (`userId`, `strategy` ("hybrid" | "cold_start"), `videoIds`, `cachedAt`, `generatedAt`)
- [ ] `cache/RecommendationCacheService` -- Redis `rec:{userId}` get / put / invalidate, **TTL 10 minutes**; cache **only hybrid** results, **never** cold-start
- [ ] `config/RedisConfig` (optional -- a `RedisTemplate<String, String>` with `StringRedisSerializer` is clearer than relying purely on `StringRedisTemplate`)
- [ ] `kafka/RecommendationEventConsumer` -- 5 `@KafkaListener` methods in consumer group `recommendation-group` (`video.watched`, `video.liked`, `user.searched`, `video.uploaded`, `user.events`)
- [ ] `kafka/events/` records: `VideoWatchedEvent`, `VideoLikedEvent`, `UserSearchedEvent`, `VideoUploadedEvent`, `UserEvent`
- [ ] `config/KafkaConfig` -- JSON deserializer + `DefaultErrorHandler` with `DeadLetterPublishingRecoverer` to `*.dlq` topics
- [ ] `interaction/InteractionService` -- score mapping (watch by completion pct, like +1, dislike -1, search_click +0.5) + rewatch detection flipping `eventType` to `REWATCH` (no extra bonus per RULES.md §3)
- [ ] `model/ProcessedEventService` -- `existsByEventId` / `save` idempotency gate
- [ ] `InteractionRepository.existsByUserIdAndVideoId(UUID, String)` -- rewatch detection
- [ ] `ItemFactorRepository.findAllVideoIds()` (`@Query("select i.videoId from ItemFactor i")`) -- candidate set for the hybrid scorer
- [ ] `shared/exception/` -- `ApiException`, `ErrorDetail`, `ErrorResponse`, `GlobalExceptionHandler` (`@ControllerAdvice`) emitting the standard `{ error: { code, message, details[] } }` envelope

---

## Package Structure (actual)

```
org.vidrec.recommendationservice
  |-- RecommendationServiceApplication.java
  |-- config/
  |   `-- DotenvEnvironmentListener.java
  |-- content/
  |   |-- ContentBasedService.java
  |   `-- ContentVectorizer.java
  |-- interaction/
  |   |-- EventType.java
  |   |-- Interaction.java
  |   `-- InteractionRepository.java
  |-- model/
  |   |-- ItemFactor.java
  |   |-- ItemFactorRepository.java
  |   |-- ItemFactorService.java
  |   |-- ProcessedEvent.java
  |   |-- ProcessedEventRepository.java
  |   |-- UserCategoryProfile.java
  |   |-- UserCategoryProfileRepository.java
  |   |-- UserCategoryProfileService.java
  |   |-- UserFactor.java
  |   `-- UserFactorRepository.java
  |-- recommendation/
  |   |-- ColdStartRecommendationsResponse.java
  |   |-- ColdStartService.java
  |   |-- RecommendationController.java
  |   |-- SimilarVideoService.java
  |   `-- SimilarVideosResponse.java
  `-- security/
      |-- HeaderAuthFilter.java
      |-- SecurityConfig.java
      `-- UserRole.java
```

---

## Package Structure (target -- when implementation lands)

Add on top of the actual layout above:

```
org.vidrec.recommendationservice
  |-- recommendation/
  |   |-- RecommendationService.java         (strategy router)
  |   |-- RecommendationResponse.java
  |   |-- HybridScorer.java
  |   `-- SvdClient.java
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
  |-- config/
  |   |-- KafkaConfig.java
  |   `-- RedisConfig.java
  `-- shared/exception/
      |-- ApiException.java
      |-- ErrorDetail.java
      |-- ErrorResponse.java
      `-- GlobalExceptionHandler.java
```

---

## Endpoints

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/recommendations/similar/{videoId}?limit=10` | none | implemented | 404 `VIDEO_NOT_FOUND` if no `item_factors` row; `limit` 1..50 |
| GET | `/recommendations/cold/{categoryId}?limit=20` | none | implemented | top-N by `globalScore` DESC; `limit` 1..50 (controller default 20) |
| GET | `/recommendations/{userId}?limit=20` | JWT (self) | **not implemented** | cold/hybrid switch at 5 interactions; 403 if `Authentication.principal` != path `userId`; 422 `NO_PREFERENCES` on cold path with no declared prefs; cache hybrid only |

Standard error envelope (target, once `shared/exception/` lands):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Limit must be between 1 and 100.",
             "details": [{ "field": "limit", "message": "must be between 1 and 100" }] } }
```

Error codes used by this service: `VALIDATION_ERROR` (400), `FORBIDDEN` (403), `USER_NOT_FOUND` (404),
`VIDEO_NOT_FOUND` (404), `CATEGORY_NOT_FOUND` (404), `NO_PREFERENCES` (422), `INTERNAL_ERROR` (500).

---

## Kafka

Consumer group: `recommendation-group`. Topics consumed (per RULES.md §3.1):

| Topic | Payload record | DLQ |
|---|---|---|
| `video.watched` | `VideoWatchedEvent` | `video.watched.dlq` |
| `video.liked` | `VideoLikedEvent` | `video.liked.dlq` |
| `user.searched` | `UserSearchedEvent` | `user.searched.dlq` |
| `video.uploaded` | `VideoUploadedEvent` | `video.uploaded.dlq` |
| `user.events` | `UserEvent` | `user.events.dlq` |

Security protocol: SASL_SSL + PLAIN (`KAFKA_SASL_USERNAME` / `KAFKA_SASL_PASSWORD`).

Every listener must:
1. Check `ProcessedEventService.existsByEventId(eventId)` -- skip if true.
2. Process (insert interaction / update item factor / update profile / invalidate cache).
3. `ProcessedEventService.save(eventId, now)`.
4. Wrap in try/catch and let the `DefaultErrorHandler` route failures to the `*.dlq` topic; do not crash the consumer.

---

## SVD Sidecar Contract

`POST ${svd.sidecar.url}/predict/batch`

```json
// request
{ "userId": "uuid", "videoIds": ["vid_1", "vid_2"] }

// response
{ "scores": [ { "videoId": "vid_1", "score": 0.85 }, { "videoId": "vid_2", "score": 0.32 } ] }
```

`SvdClient` must use Spring 4.x `RestClient`, configure 2 s connect / 5 s read timeouts, and return
`Map<videoId, 0.0>` on any failure so the hybrid path degrades to content-only.

---

## Key Business Rules

1. Score mapping is exact (see root AGENT.md "Signal to Score Mapping"). Watch: `pct<0.20 -> 0.1`, `0.20..0.60 -> pct*0.8`, `pct>0.60 -> pct*1.0`. Like `+1.0`, dislike `-1.0`. Search click `+0.5` only when `clickedVideoId != null`.
2. Rewatch detection: if `userId+videoId` already exists in `interactions`, set `eventType=REWATCH` (no score bonus -- adding one requires updating RULES.md and the root AGENT.md first).
3. Cold-start threshold = 5 interactions.
4. Hybrid weights: SVD = 0.6, content = 0.4; both min-max normalized to `[0, 1]` before combining. If a score set is constant, normalize to 0.5.
5. Redis key: `rec:{userId}`; value = JSON array of `videoId`; **TTL = 10 minutes**; invalidate on every new interaction for that user.
6. **Cache hybrid results only.** Cold-start results must not be cached -- otherwise they go stale before the first real interaction.
7. `video.uploaded` builds the content index only; it does **not** invalidate any recommendation cache.
8. `user.events` handling:
   - `registered` -> `UserCategoryProfileService.insertDeclared(userId, interests)`
   - `prefs_updated` -> `UserCategoryProfileService.replaceDeclared(userId, preferences)`
   - `deactivated` / `banned` / `deleted` -> `RecommendationCacheService.invalidate(userId)`
   - `reinstated` -> acknowledge as no-op (cache will repopulate on next request); do not fall through to `default`
   - unknown `eventType` -> log a warning, do not throw
9. `item_factors` includes `thumbnailUrl` and `language` so cold-start and similar-video responses can render without extra HTTP calls.
10. Only admin-approved OWN videos arrive on `video.uploaded` (video-service publishes only on approve).
11. `RS-01` security: `Authentication.principal` (set by `HeaderAuthFilter` from the gateway's `X-User-Id`) must equal the path `userId`. Return 403 `FORBIDDEN` on mismatch -- do not introspect the raw JWT here.

---

## Files to Read First

1. `recommendation/RecommendationController.java`
2. `recommendation/ColdStartService.java`
3. `recommendation/SimilarVideoService.java`
4. `content/ContentBasedService.java`
5. `model/ItemFactorService.java`
6. `model/UserCategoryProfileService.java`
7. `security/HeaderAuthFilter.java`

When the missing pieces land:

8. `kafka/RecommendationEventConsumer.java`
9. `recommendation/RecommendationService.java` + `HybridScorer.java`
10. `cache/RecommendationCacheService.java`

---

## Known Issues / TODOs

- Everything in the "Not implemented" section above (Person A Kafka ingestion + DLQ, Person C hybrid + cache + SVD client + `/recommendations/{userId}` + error envelope).
- Full SVD training lives in the FastAPI sidecar (`backend/svd-sidecar/`); the Java client is not yet wired.
- No batch backfill job for `item_factors` over legacy videos.
- No tests beyond the default context-load test.
