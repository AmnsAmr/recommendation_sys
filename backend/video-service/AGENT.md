# AGENT.md -- video-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Handles uploads to Cloudflare R2, video metadata storage, YouTube catalog sync, search, watch event
recording, like/dislike recording, and admin moderation. This is the main Kafka producer in the
platform -- all four video-related events (`video.uploaded`, `video.watched`, `video.liked`,
`user.searched`) are published from here through a transactional outbox.

---

## Current Implementation State

- [x] Project scaffold (Spring Boot 4.0.5, JPA, Security, Kafka, Validation, WebMVC, JJWT 0.12.5, AWS S3 SDK 2.25.60, mp4parser 1.9.41, spring-retry 2.0.11)
- [x] `Video`, `VideoTag`, `Category`, `UploadToken`, `WatchSession`, `OutboxEvent`, `YouTubeSyncState` entities (schema=`video_schema`)
- [x] POST `/videos/init` -- `VideoController` + `VideoService.initUpload` -- creates `PENDING` video + upload token (15 min TTL)
- [x] PUT `/videos/{id}/upload` -- validates token (uploader, video id, expiry, used flag), validates MIME (`video/mp4` or `video/quicktime`), max 500 MB, probes duration via `VideoDurationProbe` (mp4parser), uploads to R2, sets status `UNDER_REVIEW`
- [x] GET `/videos/{id}` -- READY-only
- [x] GET `/videos/user/{userId}` -- paginated, READY-only
- [x] GET `/videos/search?q=...` -- LIKE search over title + tags
- [x] GET `/videos/catalog` -- supports `categoryId`, `source`, `language` filters
- [x] POST `/videos/watch` -- `WatchService` inserts `WatchSession`, atomic SQL `incrementViewCount`, queues outbox `video.watched`
- [x] POST `/videos/{id}/like` -- `LikeService` atomic SQL `incrementLikeCount`/`incrementDislikeCount`, queues outbox `video.liked`
- [x] POST `/videos/search/click` -- `SearchService` queues outbox `user.searched`
- [x] YouTube sync -- `youtube/` package fully implemented: `YouTubeService` (RestClient + retry + quota detection), `YouTubeSyncRunner` (ApplicationRunner + `@Scheduled` daily), `YouTubeSyncPersister` (idempotent insert by youtubeId), `YouTubeSyncState` singleton row tracking last run / quota hit / error
- [x] Admin moderation -- `AdminVideoController` exposes dashboard, pending queue, get, update, approve, reject, delete (cleans `video_tags`, `watch_sessions`, outbox rows, R2 object)
- [x] Transactional outbox -- `OutboxEvent` (`video_outbox` table) + `OutboxPublisher` polls every 1 s (`@Scheduled(fixedDelay=1000)`), marks `PENDING` -> `PUBLISHED`
- [x] Spring Security + `HeaderAuthFilter` -- verifies `X-Internal-Token`, parses `X-User-Id` / `X-User-Role`, allows GET catalog/search/{id}/user/{id} unauthenticated; `/admin/**` requires `ROLE_ADMIN`
- [x] Kafka SSL config (PKCS12 keystore + JKS truststore, env-driven)
- [x] R2 storage (`R2StorageService`) -- `upload`, `getPublicUrl`, `delete`
- [x] Global exception handling (`shared/exception/`)

---

## Package Structure (actual)

```
org.vidrec.videoservice
  |-- VideoServiceApplication.java
  |-- admin/
  |   |-- AdminVideoController.java
  |   |-- AdminVideoService.java
  |   |-- AdminModerationRequest.java
  |   |-- AdminVideoUpdateRequest.java
  |   |-- AdminVideoDashboardResponse.java
  |   |-- AdminVideoListResponse.java
  |   |-- AdminVideoSummaryResponse.java
  |   `-- AdminVideoDetailResponse.java
  |-- config/
  |   |-- DotenvEnvironmentListener.java
  |   |-- KafkaConfig.java          # only enables @Scheduled
  |   `-- R2Config.java             # S3Client for Cloudflare R2
  |-- kafka/
  |   |-- VideoEventProducer.java   # thin KafkaTemplate wrapper
  |   `-- events/
  |       |-- VideoWatchedEvent.java
  |       |-- VideoLikedEvent.java
  |       |-- UserSearchedEvent.java
  |       `-- VideoUploadedEvent.java
  |-- like/                          # NB: top-level feature package, not nested under video/
  |   |-- LikeController.java
  |   |-- LikeService.java
  |   |-- LikeRequest.java
  |   `-- LikeResponse.java
  |-- outbox/
  |   |-- OutboxEvent.java
  |   |-- OutboxEventRepository.java
  |   `-- OutboxPublisher.java       # @Scheduled fixedDelay=1000ms
  |-- search/
  |   |-- SearchController.java
  |   |-- SearchService.java
  |   |-- SearchClickRequest.java
  |   `-- SearchAckResponse.java
  |-- security/
  |   |-- SecurityConfig.java
  |   |-- HeaderAuthFilter.java
  |   |-- JwtUtil.java               # present for direct-service testing, not wired into filter chain
  |   `-- UserRole.java
  |-- shared/exception/
  |   |-- ApiException.java
  |   |-- ErrorDetail.java
  |   |-- ErrorResponse.java
  |   `-- GlobalExceptionHandler.java
  |-- storage/
  |   `-- R2StorageService.java
  |-- video/
  |   |-- VideoController.java
  |   |-- VideoService.java
  |   |-- VideoRepository.java
  |   |-- Video.java
  |   |-- VideoSource.java           # OWN | YOUTUBE
  |   |-- VideoStatus.java           # PENDING|PROCESSING|UNDER_REVIEW|READY|REJECTED|FAILED
  |   |-- VideoTag.java
  |   |-- VideoTagId.java
  |   |-- VideoTagRepository.java
  |   |-- Category.java
  |   |-- CategoryRepository.java
  |   |-- UploadToken.java
  |   |-- UploadTokenRepository.java
  |   |-- VideoDurationProbe.java    # mp4parser
  |   |-- VideoUploadInitRequest.java
  |   |-- VideoUploadInitResponse.java
  |   |-- VideoUploadResponse.java
  |   |-- VideoResponse.java
  |   |-- VideoUserListItem.java
  |   |-- VideoUserListResponse.java
  |   |-- VideoSearchItem.java
  |   |-- VideoSearchResponse.java
  |   |-- VideoCatalogItem.java
  |   `-- VideoCatalogResponse.java
  |-- watch/
  |   |-- WatchController.java
  |   |-- WatchService.java
  |   |-- WatchSession.java
  |   |-- WatchSessionRepository.java
  |   |-- WatchRequest.java
  |   `-- WatchAckResponse.java
  `-- youtube/
      |-- YouTubeConfig.java         # @EnableRetry + RestClient bean
      |-- YouTubeProperties.java     # @ConfigurationProperties record
      |-- YouTubeService.java        # search + videos endpoints, quota detection
      |-- YouTubeSyncRunner.java     # ApplicationRunner + @Scheduled (24h default)
      |-- YouTubeSyncPersister.java  # idempotent insert + outbox video.uploaded
      |-- YouTubeVideoMapper.java
      |-- YouTubeVideo.java
      |-- YouTubeSyncState.java
      |-- YouTubeSyncStateRepository.java
      |-- YouTubeApiException.java
      `-- YouTubeTransientException.java
```

Deviation note: `like/`, `search/`, `watch/`, `storage/` are top-level feature packages rather than
nested under `video/`. This matches the package-by-feature rule in RULES.md §2.1.

---

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/videos/init` | JWT | requires existing categoryId; returns videoId + uploadToken + expiresAt |
| PUT | `/videos/{id}/upload` | JWT + `X-Upload-Token` | multipart `file`; status -> UNDER_REVIEW |
| GET | `/videos/{id}` | none | 404 unless READY |
| GET | `/videos/user/{userId}` | none | READY-only, paginated |
| GET | `/videos/search?q=&page=&size=` | none | LIKE on title + tags |
| GET | `/videos/catalog` | none | optional `categoryId`, `source`, `language` |
| POST | `/videos/watch` | JWT | 202; inserts WatchSession, ++viewCount, outbox `video.watched` |
| POST | `/videos/{id}/like` | JWT | body `{action: like|dislike}`; outbox `video.liked` |
| POST | `/videos/search/click` | JWT | 202; outbox `user.searched` |
| GET | `/admin/videos/dashboard` | admin | totals by status / source / 7-day window / sum(viewCount) |
| GET | `/admin/videos/pending` | admin | UNDER_REVIEW queue |
| GET | `/admin/videos/{id}` | admin | full detail |
| PUT | `/admin/videos/{id}` | admin | edit title/description/category/language on OWN videos |
| POST | `/admin/videos/{id}/approve` | admin | UNDER_REVIEW -> READY; outbox `video.uploaded` |
| POST | `/admin/videos/{id}/reject` | admin | UNDER_REVIEW -> REJECTED |
| DELETE | `/admin/videos/{id}` | admin | OWN-only; cleans tags, watch sessions, outbox, R2 object |

---

## Key Business Rules

1. Upload is a two-step flow: `init` (DB row + token) -> `upload` (R2 + finalize).
2. OWN uploads land in `UNDER_REVIEW`; they become public only after admin `approve`.
3. `video.uploaded` is published when admin approves an OWN video, or immediately when a YouTube video is persisted by the sync job.
4. Watch events insert a `WatchSession` row and use atomic JPQL UPDATE for `view_count`.
5. Like/dislike use atomic JPQL UPDATE for `like_count`/`dislike_count`.
6. All Kafka publishes go through the outbox so they only leave after the originating DB commit -- no dual-write window.
7. YouTube sync is idempotent: skips any `youtubeId` already present in `videos`. Quota-exceeded aborts the run and writes to `YouTubeSyncState.lastQuotaHitAt`.
8. Admin endpoints reject moderation actions on YOUTUBE-source videos (only OWN videos are moderatable).
9. `HeaderAuthFilter` rejects any request not carrying the matching `X-Internal-Token`.

---

## Kafka & Outbox

- Topics produced (per RULES.md §3.1): `video.watched`, `video.liked`, `user.searched`, `video.uploaded`.
- Outbox table: `video_schema.video_outbox` -- columns include `aggregate_type`, `aggregate_id`, `topic`, `payload` (jsonb), `status` (`PENDING` / `PUBLISHED`), `created_at`, `published_at`.
- `OutboxPublisher` polls the top 50 PENDING rows every 1 s and marks them PUBLISHED after `KafkaTemplate.send().get()` resolves successfully.
- Default Kafka security protocol is **SSL** (PKCS12 keystore + JKS truststore); env-overridable.

---

## Files to Read First

1. `video/VideoService.java`
2. `watch/WatchService.java`
3. `outbox/OutboxPublisher.java`
4. `kafka/VideoEventProducer.java`
5. `youtube/YouTubeSyncRunner.java`
6. `admin/AdminVideoService.java`
7. `storage/R2StorageService.java`

---

## Known Issues / TODOs

- `OutboxPublisher` marks rows `PUBLISHED` only after `KafkaTemplate.send().get()` returns; there is no retry counter / DLQ if Kafka stays unreachable -- the row simply remains `PENDING` for the next poll.
- `R2StorageService.getPublicUrl` builds a `pub-{accountId}.r2.dev/{key}` URL assuming the bucket is exposed via Cloudflare's public dev URL; there is no signed-URL flow.
- No upload progress / chunked uploads -- single multipart up to 500 MB.
- `KafkaConfig` is a marker class only (`@EnableScheduling`); the `KafkaTemplate` is auto-configured by Spring Boot.
- `JwtUtil` exists for direct-service testing but is not wired into the filter chain; the gateway is the only path that supplies auth headers.
- No tests beyond default context load.
