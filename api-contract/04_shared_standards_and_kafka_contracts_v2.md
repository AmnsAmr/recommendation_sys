# API Contracts — Shared Standards & Kafka Event Contracts (v2)
> v2 changes: video.uploaded gains thumbnailUrl + language, video.watched score formula updated with rewatch bonus, endpoint index updated with US-05 and VS-08 language filter.

---

## Part 1 — Global Standards

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
- `details`: array of field-level issues — empty array `[]` when not applicable

### Global Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | JWT missing or malformed |
| `TOKEN_EXPIRED` | 401 | JWT is valid but expired |
| `FORBIDDEN` | 403 | Valid JWT but user lacks permission |
| `ACCOUNT_INACTIVE` | 403 | Account has been deactivated |
| `NOT_FOUND` | 404 | Generic — when specific code not available |
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
  "iat": 1698825600,
  "exp": 1698912000
}
```

The `sub` field is the `userId`. Downstream services receive it as the `X-User-Id` header after gateway validation. Services trust this header — they do not re-validate the JWT themselves.

### Pagination Format
All paginated endpoints return:
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

---

## Part 2 — Kafka Event Contracts

> These are not HTTP endpoints. They are the event payloads published to Aiven Kafka.
> All messages are JSON. All topics use `String` key (userId or videoId) and `String` value (JSON payload).
> All consumers are in `recommendation-group` consumer group.

---

### KE-01 — video.watched

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
| `completionPct` | `number (float)` | Yes | 0.0–1.0 ratio watched |
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
- `completionPct < 0.20` → score = `0.1`
- `0.20 <= completionPct <= 0.60` → score = `completionPct × 0.8`
- `completionPct > 0.60` → score = `completionPct × 1.0`
- If rewatch detected (userId + videoId already exists in interactions) → score += `0.2` bonus, eventType = `REWATCH`

---

### KE-02 — video.liked

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
- `action = "like"` → score = `+1.0`
- `action = "dislike"` → score = `-1.0`

---

### KE-03 — user.searched

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
- `clickedVideoId != null` → score = `+0.5` for clicked video
- `clickedVideoId = null` → no interaction score recorded

---

### KE-04 — video.uploaded (UPDATED in v2)

**Topic:** `video.uploaded`
**Producer:** video-service
**Consumer:** recommendation-service

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | `string (UUID)` | Yes | Unique event ID |
| `videoId` | `string` | Yes | Newly available video |
| `title` | `string` | Yes | Video title |
| `description` | `string` | No | Video description |
| `tags` | `array[string]` | Yes | Content tags |
| `categoryId` | `string` | Yes | Category |
| `thumbnailUrl` | `string` | Yes | **NEW v2** — thumbnail image URL, stored in item_factors |
| `language` | `string` | Yes | **NEW v2** — ISO 639-1 language code, stored in item_factors |
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

**Action by consumer:**
- Creates or updates `item_factors` record with tag/category/language vector
- Stores `thumbnailUrl` in `item_factors` so recommendation-service can return it without calling video-service
- Does **not** invalidate any user cache
- Does **not** create an `interactions` row

---

## Part 3 — Endpoint Index (v2)

### User Service

| ID | Method | Path | Auth | v2 change |
|---|---|---|---|---|
| US-01 | POST | `/users/register` | No | Accepts `displayName` + `interests[]`, returns JWT |
| US-02 | POST | `/users/login` | No | Returns `displayName` |
| US-03 | GET | `/users/{userId}/profile` | Yes | Returns `displayName`, `bio`, `profilePictureUrl`, `isActive`, `updatedAt` |
| US-04 | PUT | `/users/{userId}/preferences` | Yes | No change |
| US-05 | PUT | `/users/{userId}/profile` | Yes | **NEW** — update displayName, bio, profilePictureUrl |

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

---

## Part 4 — Version Changelog

| Version | Date | Summary |
|---|---|---|
| v1 | Initial | All services, 4 Kafka topics, base endpoint index |
| v2 | UML review | US-05 new endpoint, video responses gain thumbnailUrl + counts, video.uploaded gains thumbnailUrl + language, rewatch bonus in score formula, ACCOUNT_INACTIVE error code added |
