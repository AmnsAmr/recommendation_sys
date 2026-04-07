# AGENT.md — video-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Handles everything video-related: upload to Cloudflare R2, metadata storage, YouTube API catalog sync,
search, watch event recording, like/dislike recording, and publishing all four Kafka events.
This service is the **main Kafka producer** — it is the source of all interaction signals.

---

## Current Implementation State

- [ ] Project scaffold (Spring Boot, dependencies, application.yml)
- [ ] Video entity + repository + schema
- [ ] POST /videos/init — create pending video record
- [ ] PUT /videos/{id}/upload — upload to R2, update status to READY
- [ ] GET /videos/{id} — fetch metadata
- [ ] GET /videos/user/{userId} — fetch user's uploaded videos
- [ ] GET /videos/search?q= — keyword search
- [ ] GET /videos/catalog — full catalog
- [ ] POST /videos/watch — record watch event + publish video.watched
- [ ] POST /videos/{id}/like — like/dislike + publish video.liked
- [ ] YouTube API sync — fetch 50+ videos on startup + publish video.uploaded per video
- [ ] Search click tracking — publish user.searched on search + click
- [ ] Kafka producer for all 4 topics

---

## Package Structure

```
com.platform.video
  ├── video/
  │     ├── VideoController.java
  │     ├── VideoService.java
  │     ├── VideoRepository.java
  │     ├── Video.java                     entity
  │     ├── VideoTag.java                  entity
  │     ├── VideoSource.java               ENUM: OWN, YOUTUBE
  │     ├── VideoStatus.java               ENUM: PENDING, READY
  │     ├── VideoUploadInitRequest.java    DTO: title, description, tags, categoryId
  │     ├── VideoUploadInitResponse.java   DTO: videoId, uploadToken
  │     └── VideoResponse.java            DTO: full video data
  ├── watch/
  │     ├── WatchController.java          POST /videos/watch
  │     ├── WatchService.java             validates + publishes video.watched
  │     └── WatchRequest.java             DTO: userId, videoId, watchDuration, completionPct
  ├── catalog/
  │     ├── CatalogController.java        GET /videos/catalog, GET /videos/search
  │     └── CatalogService.java           search logic
  ├── youtube/
  │     ├── YouTubeService.java           fetches from YouTube Data API v3
  │     ├── YouTubeSyncRunner.java        ApplicationRunner — syncs on startup
  │     └── YouTubeVideoMapper.java       maps YouTube response to Video entity
  ├── storage/
  │     └── R2StorageService.java         upload/delete/getUrl using AWS S3 SDK (R2-compatible)
  ├── kafka/
  │     ├── VideoEventProducer.java       publishVideoUploaded, publishVideoWatched, etc.
  │     └── events/
  │           ├── VideoWatchedEvent.java
  │           ├── VideoLikedEvent.java
  │           ├── UserSearchedEvent.java
  │           └── VideoUploadedEvent.java
  └── config/
        ├── KafkaConfig.java
        ├── R2Config.java                 AmazonS3 bean pointing to R2 endpoint
        └── YouTubeConfig.java
```

---

## Key Business Rules

1. **Upload is two steps** — always:
   - Step 1: POST /videos/init → creates DB record with status=PENDING, returns videoId
   - Step 2: PUT /videos/{id}/upload → uploads to R2, updates status=READY, publishes video.uploaded
   - Never skip step 1. The pending record is needed for the upload token.

2. **video.uploaded is published for EVERY video** — own uploads AND YouTube-synced videos
   - YouTube sync fires one video.uploaded event per video on startup

3. **Watch events are tracked client-side** — the frontend sends completionPct when:
   - Video ends naturally
   - User navigates away (use `beforeunload` event)
   - Every 30 seconds during playback (heartbeat)

4. **Search click tracking** — when user clicks a result:
   - Frontend sends POST /videos/search with query + clickedVideoId
   - Service publishes user.searched event
   - The `resultVideoIds` field = the IDs shown to the user before they clicked

5. **R2 uses AWS S3 SDK** — Cloudflare R2 is S3-compatible. Use `AmazonS3` client with custom endpoint:
   ```
   endpoint: https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com
   ```

6. **YouTube sync runs once on startup via `ApplicationRunner`** — not on every request
   - Check if video already exists in DB before inserting (idempotent)
   - Pull educational/tech videos: categoryId 27 (Education) and 28 (Science & Technology)

7. **getUserVideos uses uploaderId, not JOIN with user-service**
   - `uploader_id` is stored in the `videos` table — no cross-service call needed

---

## Files to Read First

1. `video/VideoService.java` — central orchestrator for upload flow
2. `kafka/VideoEventProducer.java` — all Kafka publishing happens here
3. `youtube/YouTubeSyncRunner.java` — understand the startup sync
4. `storage/R2StorageService.java` — file storage operations
5. `watch/WatchService.java` — watch event handling

---

## Known Issues / TODOs

- No video deletion endpoint yet
- YouTube sync does not handle API quota errors gracefully
- No video duration extraction from uploaded files (stored as 0 until fixed)
- Search is basic LIKE query — no full-text search
