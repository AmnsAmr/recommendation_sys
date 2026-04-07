# AGENT.md — recommendation-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Consumes all four Kafka topics and maintains a hybrid recommendation engine.
Produces personalized video feeds using SVD collaborative filtering combined with
content-based cosine similarity. Caches results in Redis. Handles cold start for new users.

This is the **most important service in the project**. Changes here affect the core deliverable.

---

## Current Implementation State

- [ ] Project scaffold (Spring Boot, dependencies, application.yml)
- [ ] Kafka consumer — video.watched
- [ ] Kafka consumer — video.liked
- [ ] Kafka consumer — user.searched
- [ ] Kafka consumer — video.uploaded
- [ ] Interactions table — insert on every event
- [ ] SVD — incremental user/item factor update
- [ ] Content-based engine — cosine similarity on item vectors
- [ ] Hybrid scorer — weighted combination
- [ ] Cold start logic — content-based until 5 interactions
- [ ] Redis cache — get/set/invalidate
- [ ] GET /recommendations/{userId}
- [ ] GET /recommendations/similar/{videoId}
- [ ] GET /recommendations/cold/{categoryId}

---

## Package Structure

```
com.platform.recommendation
  ├── recommendation/
  │     ├── RecommendationController.java   GET /recommendations/**
  │     ├── RecommendationService.java      hybrid scoring, cold start logic
  │     ├── RecommendationResponse.java     DTO: list of videoIds
  │     └── HybridScorer.java              combines SVD + content scores
  ├── interaction/
  │     ├── Interaction.java               entity: userId, videoId, eventType, score
  │     ├── InteractionRepository.java
  │     └── EventType.java                 ENUM: WATCH, LIKE, DISLIKE, SEARCH_CLICK
  ├── svd/
  │     ├── SVDService.java                incremental factor updates, score prediction
  │     ├── UserFactor.java                entity: userId, vector FLOAT[]
  │     ├── ItemFactor.java                entity: videoId, vector FLOAT[], tags, categoryId
  │     ├── UserFactorRepository.java
  │     └── ItemFactorRepository.java
  ├── content/
  │     └── ContentBasedService.java       cosine similarity, item profile building
  ├── cache/
  │     └── RecommendationCacheService.java Redis get/set/invalidate
  ├── kafka/
  │     ├── VideoWatchedConsumer.java
  │     ├── VideoLikedConsumer.java
  │     ├── UserSearchedConsumer.java
  │     ├── VideoUploadedConsumer.java
  │     └── events/                        ← event record classes (immutable)
  │           ├── VideoWatchedEvent.java
  │           ├── VideoLikedEvent.java
  │           ├── UserSearchedEvent.java
  │           └── VideoUploadedEvent.java
  └── config/
        ├── KafkaConfig.java
        └── RedisConfig.java
```

---

## Key Business Rules

1. **Score mapping is exact — do not change without updating root AGENT.md**
   - completionPct < 0.2 → score = 0.1
   - completionPct 0.2–0.6 → score = completionPct × 0.8
   - completionPct > 0.6 → score = completionPct × 1.0
   - like → +1.0 / dislike → -1.0
   - search click → +0.5

2. **Cold start threshold = 5 interactions**
   - Count rows in `interactions` for this userId
   - < 5 → call `ContentBasedService.getColdStartRecs(categoryId)`
   - >= 5 → call `HybridScorer.score(userId)`

3. **Hybrid weights: SVD=0.6, Content=0.4** — both normalized to [0,1] first

4. **Redis key format: `rec:{userId}`** — TTL 10 minutes
   - Invalidate on every new interaction for that user
   - Populate on first request after invalidation

5. **video.uploaded consumer only builds the content index** — it does NOT invalidate cache

6. **SVD latent factors: k=20** — configurable via `application.yml` property `svd.latent-factors`

7. **Never expose `Interaction`, `UserFactor`, or `ItemFactor` entities from the controller**

---

## Files to Read First

1. `kafka/events/VideoWatchedEvent.java` — the most frequent event, understand its shape
2. `interaction/Interaction.java` — the SVD training data source
3. `svd/SVDService.java` — core algorithm
4. `recommendation/RecommendationService.java` — orchestrates everything
5. `cache/RecommendationCacheService.java` — cache logic

---

## Known Issues / TODOs

- SVD full retraining not implemented — incremental only (sufficient for demo)
- No pagination on recommendation endpoint yet — returns top 20 by default
- item_factors populated from video.uploaded events only — no batch backfill yet
