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

- [ ] Project scaffold
- [ ] Video entity + repository + schema
- [ ] POST /videos/init -- create pending video record
- [ ] PUT /videos/{id}/upload -- upload to R2, update status READY
- [ ] GET /videos/{id}
- [ ] GET /videos/user/{userId}
- [ ] GET /videos/search
- [ ] GET /videos/catalog (supports language filter)
- [ ] POST /videos/watch -- insert watch_session + publish video.watched
- [ ] POST /videos/{id}/like -- update counts + publish video.liked
- [ ] POST /videos/search/click -- publish user.searched
- [ ] YouTube sync -- publish video.uploaded per video
- [ ] Admin moderation queue / approve / reject / edit / delete video
- [ ] Admin dashboard metrics for upload volume and moderation backlog
- [ ] Transactional outbox for Kafka publishes

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

- No video deletion endpoint
- YouTube sync does not handle quota errors gracefully
- No duration extraction from uploaded files
