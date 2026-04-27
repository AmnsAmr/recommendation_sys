# AGENT.md -- video-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Handles uploads to Cloudflare R2, metadata storage, YouTube catalog sync,
search, watch event recording, like/dislike recording, and publishing Kafka events.
This service is the main Kafka producer.
It also owns moderation for platform-uploaded videos and exposes admin video dashboard metrics.

---

## Current Implementation State

- [x] Project scaffold (`pom.xml`, `application.properties`, `VideoServiceApplication`)
- [x] Video entity + repository + schema (`video/Video.java`, `video/VideoRepository.java`, schema=video_schema)
- [x] POST /videos/init -- `VideoController` + `VideoService.initUpload()`
- [x] PUT /videos/{id}/upload -- `VideoService.uploadFile()` (status -> UNDER_REVIEW for own uploads)
- [x] GET /videos/{id} (READY-only filter)
- [x] GET /videos/user/{userId} (paginated, READY-only)
- [x] GET /videos/search (`VideoRepository.search`)
- [x] GET /videos/catalog (with language filter, `VideoRepository.findCatalog`)
- [x] POST /videos/watch -- `WatchService.recordWatch()` inserts watch_session + publishes video.watched
- [x] POST /videos/{id}/like -- `LikeService.recordLike()` atomic counter updates + publishes video.liked
- [x] POST /videos/search/click -- `SearchService.recordClick()` publishes user.searched
- [ ] YouTube sync -- **not implemented** (no `youtube/` package yet; `VideoSource.YOUTUBE` enum exists)
- [x] Admin moderation queue / approve / reject / delete (`AdminVideoController` + `AdminVideoService`)
- [x] Admin dashboard metrics (`AdminVideoService.getDashboard()`)
- [x] Transactional outbox (`outbox/OutboxEvent` + `OutboxPublisher`, 1s `@Scheduled` drain)
- [x] Spring Security + header-based auth (`security/SecurityConfig`, `HeaderAuthFilter`, `JwtUtil`)
- [x] Kafka SSL/SASL config (`application.properties` + `KafkaConfig`)
- [x] R2 storage (`storage/R2StorageService`)

> Note: actual package layout differs slightly from the target below -- `like/` is its own feature package (not under `video/`), and `shared/exception/` exists for `GlobalExceptionHandler` + `ApiException`.

---

## Package Structure (target)

```
org.vidrec.videoservice
  |-- video/
  |   |-- VideoController.java
  |   |-- VideoService.java
  |   |-- VideoRepository.java
  |   |-- Video.java
  |   |-- VideoTag.java
  |   |-- VideoSource.java
  |   |-- VideoStatus.java
  |   |-- VideoUploadInitRequest.java
  |   |-- VideoUploadInitResponse.java
  |   `-- VideoResponse.java
  |-- watch/
  |   |-- WatchController.java
  |   |-- WatchService.java
  |   `-- WatchRequest.java
  |-- catalog/
  |   |-- CatalogController.java
  |   `-- CatalogService.java
  |-- youtube/
  |   |-- YouTubeService.java
  |   |-- YouTubeSyncRunner.java
  |   `-- YouTubeVideoMapper.java
  |-- admin/
  |   |-- AdminVideoController.java
  |   |-- AdminVideoService.java
  |   |-- AdminVideoDashboardResponse.java
  |   `-- ApproveVideoRequest.java
  |-- storage/
  |   `-- R2StorageService.java
  |-- kafka/
  |   |-- VideoEventProducer.java
  |   `-- events/
  |       |-- VideoWatchedEvent.java
  |       |-- VideoLikedEvent.java
  |       |-- UserSearchedEvent.java
  |       `-- VideoUploadedEvent.java
  |-- outbox/
  |   |-- OutboxEvent.java
  |   |-- OutboxEventRepository.java
  |   `-- OutboxPublisher.java
  `-- config/
      |-- KafkaConfig.java
      |-- R2Config.java
      `-- YouTubeConfig.java
```

---

## Key Business Rules

1. Upload is two steps:
   - POST /videos/init -> creates DB record with status=PENDING, returns videoId + token
   - PUT /videos/{id}/upload -> uploads to R2, updates status=UNDER_REVIEW for platform uploads
2. Own uploads are not public until an admin approves them.
3. video.uploaded is published for every YouTube video immediately, but for platform uploads only after admin approval.
4. Watch events insert watch_session and use atomic SQL increments for view_count.
5. Like/dislike updates are atomic SQL increments.
6. Kafka publish happens after DB commit (outbox or AFTER_COMMIT listener).
7. YouTube sync runs on startup and is idempotent.

---

## Files to Read First

1. `video/VideoService.java`
2. `kafka/VideoEventProducer.java`
3. `youtube/YouTubeSyncRunner.java`
4. `storage/R2StorageService.java`
5. `watch/WatchService.java`

---

## Known Issues / TODOs

- YouTube sync feature is not implemented (no `youtube/` package). Schema and `kafka/events/VideoUploadedEvent` already exist; needs `YouTubeService`, `YouTubeSyncRunner`, quota-aware retry, and a sync-state row.
- Uploaded videos do not have duration extracted; `Video.duration` is left null for OWN sources. Frontend currently has no enforced restriction to MP4/MOV either.
- `AdminVideoService.deleteVideo()` does not clean up `watch_sessions` rows, which still reference the deleted video.
- `R2StorageService` has no `delete` method, so admin-deleted videos leave their R2 object orphaned.
