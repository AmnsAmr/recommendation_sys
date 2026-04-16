# API Contracts — Video Service (v2)
> Base URL (via gateway): `http://localhost:8080`
> Direct service URL: `http://localhost:8082`
> All responses: `Content-Type: application/json`
> v2 changes: thumbnailUrl + viewCount + likeCount + dislikeCount + language added to video responses, VideoStatus extended, language added to upload request, admin moderation endpoints added

---

## VS-01 — Init Upload

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `POST` |
| URL Path | `/videos/init` |
| Description | Creates a pending video record and returns an upload token valid for 15 minutes. |

### Request

**Headers**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | `string` | Yes | Min 3, max 200 chars |
| `description` | `string` | No | Max 5000 chars |
| `categoryId` | `string` | Yes | Must exist in categories table |
| `tags` | `array[string]` | No | Max 10 tags, each max 50 chars, regex `^[a-z0-9\-]+$` |
| `language` | `string` | No | ISO 639-1 code (e.g. `"en"`, `"fr"`, `"ar"`). Default: `"en"` |

```json
{
  "title": "Introduction to Apache Kafka",
  "description": "A beginner-friendly walkthrough of Kafka concepts.",
  "categoryId": "technology",
  "tags": ["kafka", "backend", "distributed-systems"],
  "language": "en"
}
```

### Response

**Success — 201 Created**

| Field | Type | Description |
|---|---|---|
| `videoId` | `string` | Video ID — use in upload step |
| `uploadToken` | `string (UUID)` | One-time token for upload step |
| `expiresAt` | `string (ISO-8601)` | Token expiry — 15 minutes from now |

```json
{
  "videoId": "vid_k3m9p2x1",
  "uploadToken": "f7e6d5c4-b3a2-1098-fedc-ba9876543210",
  "expiresAt": "2024-11-01T10:45:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing required field, constraint violated |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `404` | `CATEGORY_NOT_FOUND` | categoryId does not exist |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Validation Rules
- `title`: min 3, max 200 chars, non-empty after trim
- `description`: max 5000 chars
- `categoryId`: non-empty, must match existing category
- `tags`: max 10, each max 50 chars, regex `^[a-z0-9\-]+$`
- `language`: ISO 639-1 two-letter code if provided

### Security
- Authentication required: **Yes**
- `uploaderId` extracted from JWT

### Idempotency
- **No** — each call creates a new pending record and token.

---

## VS-02 — Upload Video File

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `PUT` |
| URL Path | `/videos/{videoId}/upload` |
| Description | Uploads the actual video file to R2 storage. Platform uploads move to `UNDER_REVIEW` and remain private until an admin approves them. `video.uploaded` is published only after approval. |

### Request

**Headers**
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
X-Upload-Token: {uploadToken}
```

**Path Parameters**

| Parameter | Type | Required | Example |
|---|---|---|---|
| `videoId` | `string` | Yes | `vid_k3m9p2x1` |

**Form Fields**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `file` | `binary` | Yes | Max 500 MB, types: `video/mp4`, `video/webm`, `video/quicktime` |

### Response

**Success — 200 OK**

| Field | Type | Description |
|---|---|---|
| `videoId` | `string` | Video ID |
| `status` | `string` | `"UNDER_REVIEW"` |
| `thumbnailUrl` | `string` | Auto-generated thumbnail URL from R2 |
| `url` | `string` | Signed R2 streaming URL |
| `uploadedAt` | `string (ISO-8601)` | Upload completion timestamp |

```json
{
  "videoId": "vid_k3m9p2x1",
  "status": "UNDER_REVIEW",
  "thumbnailUrl": "https://pub-xxx.r2.dev/thumbnails/vid_k3m9p2x1.jpg",
  "url": "https://pub-xxx.r2.dev/vid_k3m9p2x1.mp4",
  "uploadedAt": "2024-11-01T10:35:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `INVALID_FILE_TYPE` | MIME type not allowed |
| `400` | `FILE_TOO_LARGE` | File exceeds 500 MB |
| `400` | `INVALID_UPLOAD_TOKEN` | Token missing, wrong, or expired |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `403` | `FORBIDDEN` | JWT userId does not match uploaderId |
| `404` | `VIDEO_NOT_FOUND` | No PENDING video with this ID |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Validation Rules
- `videoId`: must match a video with status `PENDING`
- `X-Upload-Token`: must match token issued in VS-01, not expired, not already used
- `file`: MIME one of `video/mp4`, `video/webm`, `video/quicktime`, max 500 MB

### Security
- Authentication required: **Yes**
- Only the uploader can upload the file

### Idempotency
- **No** — repeated calls overwrite file and re-publish Kafka event.

---

## VS-03 — Get Video

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `GET` |
| URL Path | `/videos/{videoId}` |
| Description | Returns full metadata for a single video. |

### Request

**Headers**
```
(none required)
```

**Path Parameters**

| Parameter | Type | Required | Example |
|---|---|---|---|
| `videoId` | `string` | Yes | `vid_k3m9p2x1` |

### Response

**Success — 200 OK**

| Field | Type | Description |
|---|---|---|
| `videoId` | `string` | Video ID |
| `title` | `string` | Video title |
| `description` | `string \| null` | Video description |
| `categoryId` | `string` | Category ID |
| `tags` | `array[string]` | Tags |
| `source` | `string (enum)` | `"own"` or `"youtube"` |
| `youtubeId` | `string \| null` | YouTube video ID (null if own) |
| `url` | `string \| null` | R2 stream URL (null if youtube) |
| `thumbnailUrl` | `string \| null` | Thumbnail image URL |
| `duration` | `integer` | Duration in seconds |
| `viewCount` | `integer` | Total view count |
| `likeCount` | `integer` | Total like count |
| `dislikeCount` | `integer` | Total dislike count |
| `language` | `string` | ISO 639-1 language code |
| `uploaderId` | `string (UUID) \| null` | Uploader ID (null if youtube) |
| `status` | `string (enum)` | `"PENDING"`, `"PROCESSING"`, `"UNDER_REVIEW"`, `"READY"`, `"REJECTED"`, or `"FAILED"` |
| `createdAt` | `string (ISO-8601)` | Creation timestamp |

```json
{
  "videoId": "vid_k3m9p2x1",
  "title": "Introduction to Apache Kafka",
  "description": "A beginner-friendly walkthrough of Kafka concepts.",
  "categoryId": "technology",
  "tags": ["kafka", "backend", "distributed-systems"],
  "source": "own",
  "youtubeId": null,
  "url": "https://pub-xxx.r2.dev/vid_k3m9p2x1.mp4",
  "thumbnailUrl": "https://pub-xxx.r2.dev/thumbnails/vid_k3m9p2x1.jpg",
  "duration": 1240,
  "viewCount": 342,
  "likeCount": 28,
  "dislikeCount": 2,
  "language": "en",
  "uploaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "READY",
  "createdAt": "2024-11-01T10:35:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `404` | `VIDEO_NOT_FOUND` | No video with this ID |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Security
- Authentication required: **No**

### Idempotency
- **Yes** — read-only.

---

## VS-04 — Get Videos by User

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `GET` |
| URL Path | `/videos/user/{userId}` |
| Description | Returns all videos uploaded by a specific user. |

### Request

**Path Parameters**

| Parameter | Type | Required | Example |
|---|---|---|---|
| `userId` | `string (UUID)` | Yes | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

**Query Parameters**

| Parameter | Type | Required | Default | Example |
|---|---|---|---|---|
| `page` | `integer` | No | `0` | `0` |
| `size` | `integer` | No | `20` | `20` |

### Response

**Success — 200 OK**

```json
{
  "videos": [
    {
      "videoId": "vid_k3m9p2x1",
      "title": "Introduction to Apache Kafka",
      "categoryId": "technology",
      "tags": ["kafka", "backend"],
      "thumbnailUrl": "https://pub-xxx.r2.dev/thumbnails/vid_k3m9p2x1.jpg",
      "duration": 1240,
      "viewCount": 342,
      "likeCount": 28,
      "dislikeCount": 2,
      "language": "en",
      "status": "READY",
      "createdAt": "2024-11-01T10:35:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid page or size |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Security
- Authentication required: **No**

### Idempotency
- **Yes** — read-only.

---

## VS-05 — Search Videos

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `GET` |
| URL Path | `/videos/search` |
| Description | Searches videos by keyword across title and tags. |

### Request

**Query Parameters**

| Parameter | Type | Required | Default | Example |
|---|---|---|---|---|
| `q` | `string` | Yes | — | `kafka tutorial` |
| `page` | `integer` | No | `0` | `0` |
| `size` | `integer` | No | `20` | `20` |

### Response

**Success — 200 OK**

```json
{
  "query": "kafka tutorial",
  "videos": [
    {
      "videoId": "vid_k3m9p2x1",
      "title": "Introduction to Apache Kafka",
      "categoryId": "technology",
      "tags": ["kafka", "backend"],
      "thumbnailUrl": "https://pub-xxx.r2.dev/thumbnails/vid_k3m9p2x1.jpg",
      "duration": 1240,
      "viewCount": 342,
      "likeCount": 28,
      "language": "en",
      "source": "own",
      "createdAt": "2024-11-01T10:35:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | `q` missing or empty |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Security
- Authentication required: **No**

### Idempotency
- **Yes** — read-only.

---

## VS-06 — Record Watch Event

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `POST` |
| URL Path | `/videos/watch` |
| Description | Records a watch_session row and atomically increments viewCount. Publishes `video.watched` after commit; item_factors.view_count is updated by recommendation-service from this event. |

### Request

**Headers**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `videoId` | `string` | Yes | Must be an existing public `READY` video |
| `watchDuration` | `integer` | Yes | Seconds watched, >= 0 |
| `videoDuration` | `integer` | Yes | Total video length, > 0 |
| `completionPct` | `number (float)` | Yes | 0.0 to 1.0 |
| `source` | `string (enum)` | Yes | `"own"` or `"youtube"` |

```json
{
  "videoId": "vid_k3m9p2x1",
  "watchDuration": 993,
  "videoDuration": 1240,
  "completionPct": 0.80,
  "source": "own"
}
```

### Response

**Success — 202 Accepted**

```json
{
  "acknowledged": true
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid field values |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `404` | `VIDEO_NOT_FOUND` | No video with this ID |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Security
- Authentication required: **Yes**
- `userId` extracted from JWT

### Idempotency
- **No** — each call creates a new WatchSession row.

---

## VS-07 — Like / Dislike Video

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `POST` |
| URL Path | `/videos/{videoId}/like` |
| Description | Records a like or dislike. Atomically updates likeCount / dislikeCount counters. Publishes `video.liked` after commit. |

### Request

**Headers**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Path Parameters**

| Parameter | Type | Required | Example |
|---|---|---|---|
| `videoId` | `string` | Yes | `vid_k3m9p2x1` |

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `action` | `string (enum)` | Yes | `"like"` or `"dislike"` |

```json
{ "action": "like" }
```

### Response

**Success — 200 OK**

```json
{
  "videoId": "vid_k3m9p2x1",
  "action": "like",
  "likeCount": 29,
  "dislikeCount": 2,
  "recordedAt": "2024-11-01T10:40:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid action value |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `404` | `VIDEO_NOT_FOUND` | No video with this ID |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Security
- Authentication required: **Yes**

### Idempotency
- **No** — each call appends a new interaction.

---

## VS-08 — Get Catalog

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `GET` |
| URL Path | `/videos/catalog` |
| Description | Returns all READY videos with optional filters. |

### Request

**Query Parameters**

| Parameter | Type | Required | Default | Example |
|---|---|---|---|---|
| `categoryId` | `string` | No | — | `technology` |
| `source` | `string (enum)` | No | — | `youtube` |
| `language` | `string` | No | — | `en` |
| `page` | `integer` | No | `0` | `0` |
| `size` | `integer` | No | `20` | `20` |

### Response

**Success — 200 OK**

```json
{
  "videos": [
    {
      "videoId": "yt_dQw4w9WgXcQ",
      "title": "Understanding Microservices",
      "categoryId": "technology",
      "tags": ["microservices", "architecture"],
      "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      "source": "youtube",
      "youtubeId": "dQw4w9WgXcQ",
      "duration": 1800,
      "viewCount": 1240,
      "likeCount": 98,
      "dislikeCount": 3,
      "language": "en",
      "createdAt": "2024-11-01T08:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 87
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid source enum or page/size value |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Security
- Authentication required: **No**

### Idempotency
- **Yes** — read-only.

---

## VS-09 — Record Search Click

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `POST` |
| URL Path | `/videos/search/click` |
| Description | Records a search query and the clicked result. Publishes `user.searched` Kafka event. |

### Request

**Headers**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `query` | `string` | Yes | Non-empty, max 200 chars |
| `resultVideoIds` | `array[string]` | Yes | Max 50 items |
| `clickedVideoId` | `string \| null` | No | ID clicked, null if none |

```json
{
  "query": "kafka tutorial",
  "resultVideoIds": ["vid_k3m9p2x1", "yt_dQw4w9WgXcQ"],
  "clickedVideoId": "vid_k3m9p2x1"
}
```

### Response

**Success — 202 Accepted**

```json
{ "acknowledged": true }
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Empty query, too many result IDs |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Security
- Authentication required: **Yes**

### Idempotency
- **No** — each call produces a new Kafka event.

---

## VS-10 — Admin Video Dashboard

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `GET` |
| URL Path | `/admin/videos/dashboard` |
| Description | Returns video-side platform metrics for the admin dashboard, including moderation backlog and public catalog counts. |

### Request

**Headers**
```
Authorization: Bearer {admin_jwt}
```

### Response

**Success — 200 OK**

```json
{
  "totalVideos": 840,
  "publicVideos": 721,
  "pendingReviewVideos": 34,
  "rejectedVideos": 12,
  "youtubeVideos": 401,
  "platformVideos": 439,
  "uploadsLast7Days": 58,
  "totalViews": 124093
}
```

### Security
- Authentication required: **Yes**
- Admin role required: **Yes**

---

## VS-11 — List Pending Videos

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `GET` |
| URL Path | `/admin/videos/pending` |
| Description | Returns the moderation queue of platform-uploaded videos awaiting review. |

### Request

**Headers**
```
Authorization: Bearer {admin_jwt}
```

### Response

**Success — 200 OK**

```json
{
  "videos": [
    {
      "videoId": "vid_k3m9p2x1",
      "title": "Introduction to Apache Kafka",
      "uploaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "UNDER_REVIEW",
      "thumbnailUrl": "https://pub-xxx.r2.dev/thumbnails/vid_k3m9p2x1.jpg",
      "createdAt": "2024-11-01T10:35:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1
}
```

### Security
- Authentication required: **Yes**
- Admin role required: **Yes**

---

## VS-12 — Get Video For Admin

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `GET` |
| URL Path | `/admin/videos/{videoId}` |
| Description | Returns full metadata for a video including moderation fields. |

### Request

**Headers**
```
Authorization: Bearer {admin_jwt}
```

### Response

**Success — 200 OK**

```json
{
  "videoId": "vid_k3m9p2x1",
  "title": "Introduction to Apache Kafka",
  "description": "A beginner-friendly walkthrough of Kafka concepts.",
  "categoryId": "technology",
  "status": "UNDER_REVIEW",
  "uploaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "thumbnailUrl": "https://pub-xxx.r2.dev/thumbnails/vid_k3m9p2x1.jpg",
  "moderationNotes": null,
  "reviewedBy": null,
  "reviewedAt": null,
  "publishedAt": null
}
```

### Security
- Authentication required: **Yes**
- Admin role required: **Yes**

---

## VS-13 — Update Video As Admin

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `PUT` |
| URL Path | `/admin/videos/{videoId}` |
| Description | Allows an admin to edit platform-uploaded video metadata without changing visibility. |

### Request

**Headers**
```
Authorization: Bearer {admin_jwt}
Content-Type: application/json
```

**Request Body**

```json
{
  "title": "Reviewed Kafka Introduction",
  "description": "Metadata updated by admin",
  "categoryId": "technology",
  "language": "en"
}
```

### Security
- Authentication required: **Yes**
- Admin role required: **Yes**

---

## VS-14 — Approve Video

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `POST` |
| URL Path | `/admin/videos/{videoId}/approve` |
| Description | Approves a platform-uploaded video, sets status to `READY`, stamps moderation info, and publishes `video.uploaded` after commit. |

### Request

**Headers**
```
Authorization: Bearer {admin_jwt}
Content-Type: application/json
```

**Request Body**

```json
{
  "notes": "Content reviewed and approved"
}
```

### Security
- Authentication required: **Yes**
- Admin role required: **Yes**

---

## VS-15 — Reject Video

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `POST` |
| URL Path | `/admin/videos/{videoId}/reject` |
| Description | Rejects a platform-uploaded video and stores moderation notes. Rejected videos remain private. |

### Request

**Headers**
```
Authorization: Bearer {admin_jwt}
Content-Type: application/json
```

**Request Body**

```json
{
  "notes": "Contains prohibited content"
}
```

### Security
- Authentication required: **Yes**
- Admin role required: **Yes**

---

## VS-16 — Delete Video

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `DELETE` |
| URL Path | `/admin/videos/{videoId}` |
| Description | Deletes a platform-uploaded video and its local moderation/upload metadata. |

### Request

**Headers**
```
Authorization: Bearer {admin_jwt}
```

### Response

**Success — 204 No Content**

### Security
- Authentication required: **Yes**
- Admin role required: **Yes**
