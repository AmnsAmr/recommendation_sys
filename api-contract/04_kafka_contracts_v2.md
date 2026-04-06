# API Contracts — Kafka Event Contracts (v2)
> v2 changes: video.uploaded event gains thumbnailUrl and language fields.
> All other topics unchanged.

---

## KE-01 — video.watched

**Topic:** `video.watched`
**Producer:** video-service
**Consumer:** recommendation-service
**No changes from v1**

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | `string (UUID)` | Yes | Unique event ID |
| `userId` | `string (UUID)` | Yes | User who watched |
| `videoId` | `string` | Yes | Video watched |
| `watchDuration` | `integer` | Yes | Seconds actually watched |
| `videoDuration` | `integer` | Yes | Total video length in seconds |
| `completionPct` | `number (float)` | Yes | 0.0–1.0 |
| `source` | `string (enum)` | Yes | `"own"` or `"youtube"` |
| `timestamp` | `string (ISO-8601)` | Yes | When event occurred |

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
- If rewatch detected (userId + videoId exists in interactions) → score += `0.2` bonus

---

## KE-02 — video.liked

**Topic:** `video.liked`
**Producer:** video-service
**Consumer:** recommendation-service
**No changes from v1**

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | `string (UUID)` | Yes | Unique event ID |
| `userId` | `string (UUID)` | Yes | User who acted |
| `videoId` | `string` | Yes | Video liked/disliked |
| `action` | `string (enum)` | Yes | `"like"` or `"dislike"` |
| `source` | `string (enum)` | Yes | `"own"` or `"youtube"` |
| `timestamp` | `string (ISO-8601)` | Yes | When event occurred |

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

## KE-03 — user.searched

**Topic:** `user.searched`
**Producer:** video-service
**Consumer:** recommendation-service
**No changes from v1**

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | `string (UUID)` | Yes | Unique event ID |
| `userId` | `string (UUID)` | Yes | User who searched |
| `query` | `string` | Yes | Search query string |
| `resultVideoIds` | `array[string]` | Yes | IDs shown in results |
| `clickedVideoId` | `string \| null` | No | Video clicked, null if none |
| `timestamp` | `string (ISO-8601)` | Yes | When event occurred |

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
- `clickedVideoId = null` → no score recorded

---

## KE-04 — video.uploaded (UPDATED)

**Topic:** `video.uploaded`
**Producer:** video-service
**Consumer:** recommendation-service
**v2 changes: added `thumbnailUrl` and `language`**

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | `string (UUID)` | Yes | Unique event ID |
| `videoId` | `string` | Yes | Newly available video |
| `title` | `string` | Yes | Video title |
| `description` | `string` | No | Video description |
| `tags` | `array[string]` | Yes | Content tags |
| `categoryId` | `string` | Yes | Category |
| `thumbnailUrl` | `string` | Yes | **NEW** — thumbnail image URL, stored in item_factors |
| `language` | `string` | Yes | **NEW** — ISO 639-1 language code, stored in item_factors |
| `source` | `string (enum)` | Yes | `"own"` or `"youtube"` |
| `timestamp` | `string (ISO-8601)` | Yes | When event occurred |

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

## Changelog

| Version | Topic | Change |
|---|---|---|
| v1 | All | Initial contracts |
| v2 | `video.uploaded` | Added `thumbnailUrl` field |
| v2 | `video.uploaded` | Added `language` field |
| v2 | `video.watched` | Added rewatch bonus to score formula (+0.2) |
| v2 | `video.liked` | No change |
| v2 | `user.searched` | No change |
