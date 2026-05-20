# Person A — Kafka Ingestion & Interaction Pipeline

**Project:** Video Platform Hybrid Recommendation Engine  
**Service:** `recommendation-service` (Spring Boot 4.0.5)  
**Base path:** `backend/recommendation-service/src/main/java/org/vidrec/recommendationservice/`

---

## Day 1 Contract (publish before coding)

You publish the **Event DTO record shapes** (KE-01 through KE-05) so B and C can import them.

You depend on:
- **Person B:** `ItemFactorService.upsert()` + `ItemFactorService.incrementViewCount()` + `UserCategoryProfileService.insertDeclared()` / `replaceDeclared()`
- **Person C:** `RecommendationCacheService.invalidate(UUID userId)`

---

## Folders to Create

```
recommendationservice/
├── kafka/
│   └── events/
├── config/
├── interaction/
└── model/
```

---

## Files to Create

| # | File | Package | What it does |
|---|------|---------|--------------|
| 1 | `VideoWatchedEvent.java` | `kafka/events/` | Java record DTO matching KE-01: eventId, userId, videoId, watchDuration, videoDuration, completionPct, source, timestamp |
| 2 | `VideoLikedEvent.java` | `kafka/events/` | Java record DTO matching KE-02: eventId, userId, videoId, action (like/dislike), source, timestamp |
| 3 | `UserSearchedEvent.java` | `kafka/events/` | Java record DTO matching KE-03: eventId, userId, query, resultVideoIds, clickedVideoId, timestamp |
| 4 | `VideoUploadedEvent.java` | `kafka/events/` | Java record DTO matching KE-04: eventId, videoId, title, description, tags, categoryId, thumbnailUrl, language, source, timestamp |
| 5 | `UserEvent.java` | `kafka/events/` | Java record DTO matching KE-05: eventId, userId, eventType (registered/deactivated/prefs_updated/banned/deleted), username, interests, preferences, reason, timestamp |
| 6 | `RecommendationEventConsumer.java` | `kafka/` | 5 `@KafkaListener` methods, all in consumer group `recommendation-group` |
| 7 | `KafkaConfig.java` | `config/` | JSON deserializer config + `DefaultErrorHandler` with DLQ routing |
| 8 | `InteractionService.java` | `interaction/` | Score mapping logic + insert into `interactions` table |
| 9 | `ProcessedEventService.java` | `model/` | Idempotency gate: `existsByEventId` / `save` |
| 10 | `Interaction.java` | `interaction/` | JPA entity for `interactions` table |
| 11 | `InteractionRepository.java` | `interaction/` | Spring Data JPA repo, includes `countByUserId(UUID)` for C's cold-start gate |
| 12 | `ProcessedEvent.java` | `model/` | JPA entity for `processed_events` table |
| 13 | `ProcessedEventRepository.java` | `model/` | Spring Data JPA repo |
| 14 | `EventType.java` | `interaction/` | Enum: WATCH, LIKE, DISLIKE, SEARCH_CLICK, REWATCH |

---

## Detailed Tasks

### 1. Create all 5 Event DTOs (Java records)

- [ ] `VideoWatchedEvent.java` — fields: `String eventId`, `String userId`, `String videoId`, `int watchDuration`, `int videoDuration`, `double completionPct`, `String source`, `String timestamp`
- [ ] `VideoLikedEvent.java` — fields: `String eventId`, `String userId`, `String videoId`, `String action`, `String source`, `String timestamp`
- [ ] `UserSearchedEvent.java` — fields: `String eventId`, `String userId`, `String query`, `List<String> resultVideoIds`, `String clickedVideoId`, `String timestamp`
- [ ] `VideoUploadedEvent.java` — fields: `String eventId`, `String videoId`, `String title`, `String description`, `List<String> tags`, `String categoryId`, `String thumbnailUrl`, `String language`, `String source`, `String timestamp`
- [ ] `UserEvent.java` — fields: `String eventId`, `String userId`, `String eventType`, `String username`, `List<String> interests`, `List<String> preferences`, `String reason`, `String timestamp`

### 2. Implement KafkaConfig.java

- [ ] JSON deserializer for all 5 topics
- [ ] `DefaultErrorHandler` with `DeadLetterPublishingRecoverer`
- [ ] DLQ topic names:
  - `video.watched.dlq`
  - `video.liked.dlq`
  - `user.searched.dlq`
  - `video.uploaded.dlq`
  - `user.events.dlq`
- [ ] Pin Kafka client version in `pom.xml` (Spring Boot 4.0.5 differs from 3.x)

### 3. Implement Entities

- [ ] `EventType.java` enum: `WATCH`, `LIKE`, `DISLIKE`, `SEARCH_CLICK`, `REWATCH`
- [ ] `Interaction.java` JPA entity
  - Table: `interactions` in `recommendation_schema`
  - Fields: id (UUID PK), userId (UUID, indexed), videoId (VARCHAR, indexed), eventType (EventType), score (Double), completionPct (Double), createdAt (LocalDateTime)
  - Composite index on (userId, videoId)
- [ ] `InteractionRepository.java`
  - `countByUserId(UUID userId)` — needed by C for cold-start threshold
  - `existsByUserIdAndVideoId(UUID userId, String videoId)` — for rewatch detection
- [ ] `ProcessedEvent.java` JPA entity
  - Table: `processed_events` in `recommendation_schema`
  - Fields: eventId (VARCHAR PK), processedAt (LocalDateTime)
- [ ] `ProcessedEventRepository.java`
  - `existsByEventId(String eventId)`

### 4. Implement ProcessedEventService.java

- [ ] `existsByEventId(String eventId)` → boolean
- [ ] `save(String eventId, LocalDateTime processedAt)` → void
- [ ] Uses `processed_events` table (PK: event_id)

### 5. Implement InteractionService.java

- [ ] Score mapping for `video.watched`:
  - `completionPct < 0.20` → score = `0.1`
  - `0.20 <= completionPct <= 0.60` → score = `completionPct × 0.8`
  - `completionPct > 0.60` → score = `completionPct × 1.0`
- [ ] Rewatch detection:
  - If `userId + videoId` already exists in interactions → score += `0.2` bonus, eventType = `REWATCH`
- [ ] Score mapping for `video.liked`:
  - action = `"like"` → score = `+1.0`
  - action = `"dislike"` → score = `-1.0`
- [ ] Score mapping for `user.searched`:
  - `clickedVideoId != null` → score = `+0.5` for clicked video
  - `clickedVideoId == null` → no interaction recorded
- [ ] Insert into `interactions` table: id, userId, videoId, eventType, score, completionPct, createdAt

### 6. Implement RecommendationEventConsumer.java

5 `@KafkaListener` methods, all in consumer group `recommendation-group`. Every listener follows the same pattern: check idempotency → process → save processed event → try-catch with DLT routing.

- [ ] `onVideoWatched(VideoWatchedEvent)`:
  1. Check `ProcessedEventService.existsByEventId(eventId)` → skip if true
  2. `InteractionService.insertWatchInteraction(event)` (applies score mapping + rewatch detection)
  3. Call B's `ItemFactorService.incrementViewCount(videoId)`
  4. Call C's `RecommendationCacheService.invalidate(userId)`
  5. `ProcessedEventService.save(eventId)`
  6. Wrap in try-catch → DLT on failure

- [ ] `onVideoLiked(VideoLikedEvent)`:
  1. Dedup check
  2. `InteractionService.insertLikeInteraction(event)`
  3. Call C's `RecommendationCacheService.invalidate(userId)`
  4. Save processed event

- [ ] `onUserSearched(UserSearchedEvent)`:
  1. Dedup check
  2. If `clickedVideoId != null` → `InteractionService.insertSearchInteraction(event)`
  3. Save processed event
  4. (No cache invalidation needed)

- [ ] `onVideoUploaded(VideoUploadedEvent)`:
  1. Dedup check
  2. Call B's `ItemFactorService.upsert(videoId, tags, categoryId, thumbnailUrl, language)`
  3. Save processed event
  4. **NO cache invalidation** — this doesn't affect any user's recommendations

- [ ] `onUserEvent(UserEvent)`:
  1. Dedup check
  2. Switch on `eventType`:
     - `"registered"` → call B's `UserCategoryProfileService.insertDeclared(userId, interests)`
     - `"prefs_updated"` → call B's `UserCategoryProfileService.replaceDeclared(userId, preferences)`
     - `"banned"` / `"deactivated"` / `"deleted"` → call C's `RecommendationCacheService.invalidate(userId)`
  3. Save processed event

### 7. Wire Dependencies

- [ ] Inject B's `ItemFactorService`
- [ ] Inject B's `UserCategoryProfileService`
- [ ] Inject C's `RecommendationCacheService`

---

## Definition of Done

- [ ] Events end-to-end produce DB rows in `interactions` table
- [ ] Dedup works — same eventId processed twice results in single row
- [ ] Failures land in the correct `*.dlq` topic
- [ ] No consumer crashes on malformed events
- [ ] Score mapping matches the exact formulas above
- [ ] Rewatch bonus (+0.2) applied correctly

---

## Milestones

| Week | Target |
|------|--------|
| Week 1 | Consumers persist interactions to DB, dedup works via processed_events |
| Week 2 | DLQ wired and tested, failures land in *.dlq topics, all consumers stable against real Kafka traffic |

---

## Risks

- **Spring Boot 4.0.5 + Kafka starter compatibility** — pin a Kafka client version in `pom.xml` early; consumer config differs from Boot 3.x
