# API Contracts — Shared Standards & Kafka Event Contracts

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

The `sub` field is the `userId`. Downstream services receive it as the `X-User-Id` header after gateway validation.

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

---

## Part 2 — Kafka Event Contracts

> These are not HTTP endpoints. They are the event payloads published to Aiven Kafka.
> All messages are JSON. All topics use `String` key (userId or videoId) and `String` value (JSON payload).

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

### KE-04 — video.uploaded

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
  "source": "own",
  "timestamp": "2024-11-01T10:35:00Z"
}
```

**Action by consumer:**
- Creates or updates `item_factors` record with tag/category vector
- Does **not** invalidate any user cache
- Does **not** create an `interactions` row

---

## Part 3 — Endpoint Index

### User Service

| ID | Method | Path | Auth |
|---|---|---|---|
| US-01 | POST | `/users/register` | No |
| US-02 | POST | `/users/login` | No |
| US-03 | GET | `/users/{userId}/profile` | Yes |
| US-04 | PUT | `/users/{userId}/preferences` | Yes |

### Video Service

| ID | Method | Path | Auth |
|---|---|---|---|
| VS-01 | POST | `/videos/init` | Yes |
| VS-02 | PUT | `/videos/{videoId}/upload` | Yes |
| VS-03 | GET | `/videos/{videoId}` | No |
| VS-04 | GET | `/videos/user/{userId}` | No |
| VS-05 | GET | `/videos/search` | No |
| VS-06 | POST | `/videos/watch` | Yes |
| VS-07 | POST | `/videos/{videoId}/like` | Yes |
| VS-08 | GET | `/videos/catalog` | No |
| VS-09 | POST | `/videos/search/click` | Yes |

### Recommendation Service

| ID | Method | Path | Auth |
|---|---|---|---|
| RS-01 | GET | `/recommendations/{userId}` | Yes |
| RS-02 | GET | `/recommendations/similar/{videoId}` | No |
| RS-03 | GET | `/recommendations/cold/{categoryId}` | No |

### Kafka Topics

| ID | Topic | Producer | Consumer |
|---|---|---|---|
| KE-01 | `video.watched` | video-service | recommendation-service |
| KE-02 | `video.liked` | video-service | recommendation-service |
| KE-03 | `user.searched` | video-service | recommendation-service |
| KE-04 | `video.uploaded` | video-service | recommendation-service |
