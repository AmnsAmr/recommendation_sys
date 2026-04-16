# API Contracts -- Shared Standards & Kafka Event Contracts (v2)
> v2 changes: video.uploaded gains thumbnailUrl + language, user lifecycle topics added, idempotent event processing + DLQ defined, pagination envelope clarified, internal trust boundary documented.

---

## Part 1 -- Global Standards

### Standard Error Format
Every error response across all services follows this exact format:

```json
{
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human readable description of what went wrong.",
    "details": [
      {
        "field": "fieldName",
        "issue": "Specific problem with this field"
      }
    ]
  }
}
```

- `code`: uppercase snake_case string, machine-readable
- `message`: English human-readable string, safe to display
- `details`: array of field-level issues -- empty array `[]` when not applicable

### Global Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | JWT missing or malformed |
| `TOKEN_EXPIRED` | 401 | JWT is valid but expired |
| `FORBIDDEN` | 403 | Valid JWT but user lacks permission |
| `ACCOUNT_INACTIVE` | 403 | Account has been deactivated |
| `ACCOUNT_BANNED` | 403 | Account has been banned by an admin |
| `NOT_FOUND` | 404 | Generic -- when specific code not available |
| `VALIDATION_ERROR` | 400 | Request body or params failed validation |
| `INTERNAL_ERROR` | 500 | Unhandled server exception |

### JWT Format
All protected endpoints require:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

JWT payload:
```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "alice_dev",
  "role": "USER",
  "iat": 1698825600,
  "exp": 1698912000
}
```

The `sub` field is the `userId`. Downstream services receive it as the `X-User-Id` header after gateway validation.
The `role` field is forwarded as `X-User-Role` so admin-only routes can be enforced consistently by downstream services.

Internal trust boundary (must enforce at least one option):
1. Gateway adds `X-Internal-Token` (shared secret). Services verify it.
2. mTLS between gateway and services.
3. Services re-validate the JWT independently.

Direct service ports must not be exposed publicly.

### Pagination Format
All paginated endpoints return a pagination envelope:
```json
{
  "page": 0,
  "size": 20,
  "totalElements": 87,
  "data": [ ... ]
}
```

- `page`: zero-indexed
- `size`: items per page, max 100
- `totalElements`: total count across all pages
- `data`: array of items for this page
- If a resource-specific key is used (for example `videos`, `videoIds`), it must be explicitly documented in that endpoint contract.

### Event Processing Requirements
All Kafka events include an `eventId` and must be processed idempotently.
1. Consumers check `processed_events` by `eventId` and return early if it exists.
2. If processing succeeds, insert `processed_events(event_id, processed_at)`.
3. Configure retries + DLT per topic, and publish failures to a DLQ topic.

DLQ topics:
1. `video.watched.dlq`
2. `video.liked.dlq`
3. `user.searched.dlq`
4. `video.uploaded.dlq`
5. `user.events.dlq`

---

## Part 2 -- Kafka Event Contracts

> These are not HTTP endpoints. They are the event payloads published to Kafka.
> All messages are JSON. All topics use `String` key (userId or videoId) and `String` value (JSON payload).
> All consumers are in `recommendation-group` consumer group.

---

### KE-01 -- video.watched

**Topic:** `video.watched`
**Producer:** video-service
**Consumer:** recommendation-service

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | `string (UUID)` | Yes | Unique event ID for deduplication |
| `userId` | `string (UUID)` | Yes | User who watched |
| `videoId` | `string` | Yes | Video that was watched |
| `watchDuration` | `integer` | Yes | Seconds actually watched |
| `videoDuration` | `integer` | Yes | Total video length in seconds |
| `completionPct` | `number (float)` | Yes | 0.0-1.0 ratio watched |
| `source` | `string (enum)` | Yes | `"own"` or `"youtube"` |
| `timestamp` | `string (ISO-8601)` | Yes | When the event occurred |

```json
{
  "eventId": "c1d2e3f4-a5b6-7890-cdef-012345678901",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "videoId": "vid_k3m9p2x1",
  "watchDuration": 993,
  "videoDuration": 1240,
  "completionPct": 0.80,
  "source": "own",
  "timestamp": "2024-11-01T10:40:00Z"
}
```

**Score computed by consumer:**
- `completionPct < 0.20` -> score = `0.1`
- `0.20 <= completionPct <= 0.60` -> score = `completionPct x 0.8`
- `completionPct > 0.60` -> score = `completionPct x 1.0`
- If rewatch detected (userId + videoId already exists in interactions) -> score += `0.2` bonus, eventType = `REWATCH`

**Action by consumer:**
- Insert interaction
- Update item_factors.view_count and global_score
- Invalidate cache for userId

---

### KE-02 -- video.liked

**Topic:** `video.liked`
**Producer:** video-service
**Consumer:** recommendation-service

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | `string (UUID)` | Yes | Unique event ID |
| `userId` | `string (UUID)` | Yes | User who acted |
| `videoId` | `string` | Yes | Video that was liked/disliked |
| `action` | `string (enum)` | Yes | `"like"` or `"dislike"` |
| `source` | `string (enum)` | Yes | `"own"` or `"youtube"` |
| `timestamp` | `string (ISO-8601)` | Yes | When the event occurred |

```json
{
  "eventId": "d2e3f4a5-b6c7-8901-defa-123456789012",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "videoId": "vid_k3m9p2x1",
  "action": "like",
  "source": "own",
  "timestamp": "2024-11-01T10:42:00Z"
}
```

**Score computed by consumer:**
- `action = "like"` -> score = `+1.0`
- `action = "dislike"` -> score = `-1.0`

---

### KE-03 -- user.searched

**Topic:** `user.searched`
**Producer:** video-service
**Consumer:** recommendation-service

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | `string (UUID)` | Yes | Unique event ID |
| `userId` | `string (UUID)` | Yes | User who searched |
| `query` | `string` | Yes | Search query string |
| `resultVideoIds` | `array[string]` | Yes | IDs shown in results |
| `clickedVideoId` | `string \| null` | No | Video clicked (null if none) |
| `timestamp` | `string (ISO-8601)` | Yes | When the event occurred |

```json
{
  "eventId": "e3f4a5b6-c7d8-9012-efab-234567890123",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "query": "kafka tutorial",
  "resultVideoIds": ["vid_k3m9p2x1", "yt_dQw4w9WgXcQ"],
  "clickedVideoId": "vid_k3m9p2x1",
  "timestamp": "2024-11-01T10:38:00Z"
}
```

**Score computed by consumer:**
- `clickedVideoId != null` -> score = `+0.5` for clicked video
- `clickedVideoId = null` -> no interaction score recorded

---

### KE-04 -- video.uploaded (UPDATED in v2)

**Topic:** `video.uploaded`
**Producer:** video-service
**Consumer:** recommendation-service

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | `string (UUID)` | Yes | Unique event ID |
| `videoId` | `string` | Yes | Newly approved and publicly visible video |
| `title` | `string` | Yes | Video title |
| `description` | `string` | No | Video description |
| `tags` | `array[string]` | Yes | Content tags |
| `categoryId` | `string` | Yes | Category |
| `thumbnailUrl` | `string` | Yes | NEW v2 -- thumbnail image URL, stored in item_factors |
| `language` | `string` | Yes | NEW v2 -- ISO 639-1 language code, stored in item_factors |
| `source` | `string (enum)` | Yes | `"own"` or `"youtube"` |
| `timestamp` | `string (ISO-8601)` | Yes | When the event occurred |

```json
{
  "eventId": "f4a5b6c7-d8e9-0123-fabc-345678901234",
  "videoId": "vid_k3m9p2x1",
  "title": "Introduction to Apache Kafka",
  "description": "A beginner-friendly walkthrough of Kafka concepts.",
  "tags": ["kafka", "backend", "distributed-systems"],
  "categoryId": "technology",
  "thumbnailUrl": "https://pub-xxx.r2.dev/thumbnails/vid_k3m9p2x1.jpg",
  "language": "en",
  "source": "own",
  "timestamp": "2024-11-01T10:35:00Z"
}
```

Only admin-approved platform uploads and public YouTube imports should emit this event.

**Action by consumer:**
- Creates or updates `item_factors` record with tag/category/language vector
- Stores `thumbnailUrl` in `item_factors` so recommendation-service can return it without calling video-service
- Does not invalidate any user cache
- Does not create an `interactions` row

---

### KE-05 -- user.events (MVP consolidated)

**Topic:** `user.events`
**Producer:** user-service
**Consumer:** recommendation-service

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | `string (UUID)` | Yes | Unique event ID |
| `userId` | `string (UUID)` | Yes | User ID |
| `eventType` | `string (enum)` | Yes | `"registered"`, `"deactivated"`, `"prefs_updated"`, `"banned"`, `"deleted"` |
| `username` | `string` | No | Required when eventType = registered |
| `interests` | `array[string]` | No | Required when eventType = registered |
| `preferences` | `array[string]` | No | Required when eventType = prefs_updated |
| `reason` | `string` | No | Optional moderation reason for banned/deleted |
| `timestamp` | `string (ISO-8601)` | Yes | When the event occurred |

```json
{
  "eventId": "a5b6c7d8-e9f0-1234-abcd-567890123456",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "eventType": "registered",
  "username": "alice_dev",
  "interests": ["technology", "science", "programming"],
  "timestamp": "2024-11-01T10:31:00Z"
}
```

```json
{
  "eventId": "b6c7d8e9-f012-3456-abcd-678901234567",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "eventType": "banned",
  "reason": "Repeated spam uploads",
  "timestamp": "2024-11-01T10:50:00Z"
}
```

```json
{
  "eventId": "c7d8e9f0-1234-5678-abcd-789012345678",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "eventType": "prefs_updated",
  "preferences": ["technology", "science"],
  "timestamp": "2024-11-01T10:55:00Z"
}
```

**Action by consumer:**
- If eventType = registered: insert UserCategoryProfile per interest (weight=1.0, source=declared)
- If eventType = banned or deleted: invalidate recommendation cache and ignore future activity until the account is active again

---

## Part 3 -- Endpoint Index (v2)

### User Service

| ID | Method | Path | Auth | v2 change |
|---|---|---|---|---|
| US-01 | POST | `/users/register` | No | Accepts `displayName` + `interests[]`, returns JWT |
| US-02 | POST | `/users/login` | No | Returns `displayName` |
| US-03 | GET | `/users/{userId}/profile` | Yes | Returns `displayName`, `bio`, `profilePictureUrl`, `isActive`, `updatedAt` |
| US-04 | PUT | `/users/{userId}/preferences` | Yes | No change |
| US-05 | PUT | `/users/{userId}/profile` | Yes | NEW -- update displayName, bio, profilePictureUrl |
| US-06 | GET | `/admin/users/dashboard` | Admin | NEW -- user/admin dashboard metrics |
| US-07 | GET | `/admin/users` | Admin | NEW -- moderation list of users |
| US-08 | GET | `/admin/users/{userId}` | Admin | NEW -- inspect one user in detail |
| US-09 | PUT | `/admin/users/{userId}` | Admin | NEW -- edit role or profile/admin fields |
| US-10 | PUT | `/admin/users/{userId}/ban` | Admin | NEW -- ban a user account |
| US-11 | PUT | `/admin/users/{userId}/unban` | Admin | NEW -- restore a banned user |
| US-12 | DELETE | `/admin/users/{userId}` | Admin | NEW -- delete a user account |

### Video Service

| ID | Method | Path | Auth | v2 change |
|---|---|---|---|---|
| VS-01 | POST | `/videos/init` | Yes | Accepts `language` field |
| VS-02 | PUT | `/videos/{videoId}/upload` | Yes | Returns `thumbnailUrl` |
| VS-03 | GET | `/videos/{videoId}` | No | Returns `thumbnailUrl`, `viewCount`, `likeCount`, `dislikeCount`, `language`, extended `status` enum |
| VS-04 | GET | `/videos/user/{userId}` | No | Returns `thumbnailUrl`, `viewCount`, `likeCount` |
| VS-05 | GET | `/videos/search` | No | Returns `thumbnailUrl`, `viewCount`, `likeCount`, `language` |
| VS-06 | POST | `/videos/watch` | Yes | No change |
| VS-07 | POST | `/videos/{videoId}/like` | Yes | Response includes updated `likeCount` + `dislikeCount` |
| VS-08 | GET | `/videos/catalog` | No | Accepts `language` filter param, returns `thumbnailUrl`, `viewCount`, `likeCount`, `dislikeCount` |
| VS-09 | POST | `/videos/search/click` | Yes | No change |
| VS-10 | GET | `/admin/videos/dashboard` | Admin | NEW -- platform upload and moderation dashboard |
| VS-11 | GET | `/admin/videos/pending` | Admin | NEW -- moderation queue |
| VS-12 | GET | `/admin/videos/{videoId}` | Admin | NEW -- inspect one uploaded video |
| VS-13 | PUT | `/admin/videos/{videoId}` | Admin | NEW -- edit uploaded video metadata |
| VS-14 | POST | `/admin/videos/{videoId}/approve` | Admin | NEW -- publish video after review |
| VS-15 | POST | `/admin/videos/{videoId}/reject` | Admin | NEW -- reject video with moderation notes |
| VS-16 | DELETE | `/admin/videos/{videoId}` | Admin | NEW -- delete a platform-uploaded video |

### Recommendation Service

| ID | Method | Path | Auth | v2 change |
|---|---|---|---|---|
| RS-01 | GET | `/recommendations/{userId}` | Yes | No change |
| RS-02 | GET | `/recommendations/similar/{videoId}` | No | No change |
| RS-03 | GET | `/recommendations/cold/{categoryId}` | No | No change |

### Kafka Topics

| ID | Topic | Producer | Consumer | v2 change |
|---|---|---|---|---|
| KE-01 | `video.watched` | video-service | recommendation-service | Rewatch bonus +0.2 added to score formula |
| KE-02 | `video.liked` | video-service | recommendation-service | No change |
| KE-03 | `user.searched` | video-service | recommendation-service | No change |
| KE-04 | `video.uploaded` | video-service | recommendation-service | Added `thumbnailUrl` + `language` fields |
| KE-05 | `user.events` | user-service | recommendation-service | NEW (registered + lifecycle) |

---

## Part 4 -- Version Changelog

| Version | Date | Summary |
|---|---|---|
| v1 | Initial | All services, 4 Kafka topics, base endpoint index |
| v2 | UML review | User lifecycle topics added, video.uploaded gains thumbnailUrl + language, rewatch bonus in score formula, idempotent processing + DLQ defined, pagination clarified, ACCOUNT_INACTIVE error code added |
