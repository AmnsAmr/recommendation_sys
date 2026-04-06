# API Contracts — Video Service
> Base URL (via gateway): `http://localhost:8080`
> Direct service URL: `http://localhost:8082`
> All responses: `Content-Type: application/json`

---

## VS-01 — Init Upload

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `POST` |
| URL Path | `/videos/init` |
| Description | Creates a pending video record and returns an upload token. Must be called before sending the file. |

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
| `tags` | `array[string]` | No | Max 10 tags, each max 50 chars |

```json
{
  "title": "Introduction to Apache Kafka",
  "description": "A beginner-friendly walkthrough of Kafka concepts.",
  "categoryId": "technology",
  "tags": ["kafka", "backend", "distributed-systems"]
}
```

### Response

**Success — 201 Created**

| Field | Type | Description |
|---|---|---|
| `videoId` | `string` | Unique ID for this video (use in upload step) |
| `uploadToken` | `string (UUID)` | One-time token required for the upload step |
| `expiresAt` | `string (ISO-8601)` | Upload token expiry (15 minutes from creation) |

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
| `404` | `CATEGORY_NOT_FOUND` | Provided categoryId does not exist |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "No category found with id 'gaming'.",
    "details": []
  }
}
```

### Validation Rules
- `title`: min 3, max 200 chars, non-empty after trim
- `description`: max 5000 chars (optional)
- `categoryId`: non-empty, must match existing category
- `tags`: max 10 items, each item max 50 chars, regex `^[a-z0-9\-]+$`

### Security
- Authentication required: **Yes**
- The `uploaderId` is extracted from the JWT — not from the request body

### Idempotency
- **No** — each call creates a new pending video record and new upload token.

---

## VS-02 — Upload Video File

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `PUT` |
| URL Path | `/videos/{videoId}/upload` |
| Description | Uploads the actual video file to R2 storage. Updates video status to READY. Publishes `video.uploaded` Kafka event. |

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
| `file` | `binary` | Yes | Max 500 MB, allowed types: `video/mp4`, `video/webm`, `video/quicktime` |

### Response

**Success — 200 OK**

| Field | Type | Description |
|---|---|---|
| `videoId` | `string` | Video ID |
| `status` | `string` | Always `"READY"` |
| `url` | `string` | Signed R2 URL to stream the video |
| `uploadedAt` | `string (ISO-8601)` | Upload completion timestamp |

```json
{
  "videoId": "vid_k3m9p2x1",
  "status": "READY",
  "url": "https://pub-xxx.r2.dev/vid_k3m9p2x1.mp4",
  "uploadedAt": "2024-11-01T10:35:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `INVALID_FILE_TYPE` | File MIME type not allowed |
| `400` | `FILE_TOO_LARGE` | File exceeds 500 MB |
| `400` | `INVALID_UPLOAD_TOKEN` | Token missing, wrong, or expired |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `403` | `FORBIDDEN` | JWT userId does not match video uploaderId |
| `404` | `VIDEO_NOT_FOUND` | No video with this ID in PENDING status |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "INVALID_UPLOAD_TOKEN",
    "message": "The upload token is missing, invalid, or has expired.",
    "details": []
  }
}
```

### Validation Rules
- `videoId`: must match an existing video with status `PENDING`
- `X-Upload-Token`: must match the token issued in VS-01, not expired (15 min TTL)
- `file`: MIME type must be one of `video/mp4`, `video/webm`, `video/quicktime`
- `file`: max size 500 MB

### Security
- Authentication required: **Yes**
- Only the uploader (JWT userId == video uploaderId) can upload the file

### Idempotency
- **No** — repeated calls overwrite the file in R2 and re-publish the Kafka event.

---

## VS-03 — Get Video

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `GET` |
| URL Path | `/videos/{videoId}` |
| Description | Returns metadata for a single video. |

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
| `description` | `string` | Video description |
| `categoryId` | `string` | Category ID |
| `tags` | `array[string]` | Tags |
| `source` | `string (enum)` | `"own"` or `"youtube"` |
| `youtubeId` | `string \| null` | YouTube video ID (null if source is `"own"`) |
| `url` | `string \| null` | R2 stream URL (null if source is `"youtube"`) |
| `duration` | `integer` | Duration in seconds |
| `uploaderId` | `string (UUID)` | ID of the user who uploaded (null if YouTube) |
| `status` | `string (enum)` | `"PENDING"` or `"READY"` |
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
  "duration": 1240,
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

```json
{
  "error": {
    "code": "VIDEO_NOT_FOUND",
    "message": "No video found with the provided ID.",
    "details": []
  }
}
```

### Validation Rules
- `videoId`: non-empty string

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
| Description | Returns all videos uploaded by a specific user. Source is always `"own"`. |

### Request

**Headers**
```
(none required)
```

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
      "source": "own",
      "duration": 1240,
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
| `400` | `VALIDATION_ERROR` | Invalid page or size value |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Page must be >= 0.",
    "details": []
  }
}
```

### Validation Rules
- `userId`: valid UUID v4
- `page`: integer >= 0
- `size`: integer 1–100

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

**Headers**
```
(none required)
```

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
      "source": "own",
      "duration": 1240,
      "youtubeId": null,
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
| `400` | `VALIDATION_ERROR` | `q` is missing or empty |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Query parameter 'q' is required and must not be empty.",
    "details": []
  }
}
```

### Validation Rules
- `q`: required, min 1 char after trim, max 200 chars
- `page`: integer >= 0
- `size`: integer 1–100

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
| Description | Records a watch event for a video. Publishes `video.watched` Kafka event consumed by recommendation-service. |

### Request

**Headers**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `videoId` | `string` | Yes | Must be an existing video |
| `watchDuration` | `integer` | Yes | Seconds watched, >= 0 |
| `videoDuration` | `integer` | Yes | Total video length in seconds, > 0 |
| `completionPct` | `number (float)` | Yes | 0.0 to 1.0 inclusive |
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

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "completionPct must be between 0.0 and 1.0.",
    "details": []
  }
}
```

### Validation Rules
- `videoId`: non-empty, must exist
- `watchDuration`: integer >= 0
- `videoDuration`: integer > 0
- `completionPct`: float 0.0–1.0, must be consistent with `watchDuration / videoDuration` (± 0.05 tolerance)
- `source`: enum `own` or `youtube`

### Security
- Authentication required: **Yes**
- `userId` extracted from JWT — not accepted from request body

### Idempotency
- **No** — each call appends a new interaction record.

---

## VS-07 — Like / Dislike Video

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `POST` |
| URL Path | `/videos/{videoId}/like` |
| Description | Records a like or dislike for a video. Publishes `video.liked` Kafka event. |

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
{
  "action": "like"
}
```

### Response

**Success — 200 OK**

```json
{
  "videoId": "vid_k3m9p2x1",
  "action": "like",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Action must be 'like' or 'dislike'.",
    "details": []
  }
}
```

### Validation Rules
- `videoId`: non-empty, must exist
- `action`: enum — only `"like"` or `"dislike"` accepted (case-sensitive)

### Security
- Authentication required: **Yes**
- `userId` extracted from JWT

### Idempotency
- **No** — each call appends a new interaction. Last action wins for score calculation.

---

## VS-08 — Get Catalog

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `GET` |
| URL Path | `/videos/catalog` |
| Description | Returns all READY videos (own + YouTube) with optional category filter. |

### Request

**Headers**
```
(none required)
```

**Query Parameters**

| Parameter | Type | Required | Default | Example |
|---|---|---|---|---|
| `categoryId` | `string` | No | — | `technology` |
| `source` | `string (enum)` | No | — | `youtube` |
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
      "source": "youtube",
      "youtubeId": "dQw4w9WgXcQ",
      "duration": 1800,
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

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "source must be 'own' or 'youtube'.",
    "details": []
  }
}
```

### Validation Rules
- `categoryId`: if provided, non-empty string
- `source`: if provided, must be `"own"` or `"youtube"`
- `page`: integer >= 0
- `size`: integer 1–100

### Security
- Authentication required: **No**

### Idempotency
- **Yes** — read-only.

---

## VS-09 — Record Search + Click

| Field | Value |
|---|---|
| Service | video-service |
| HTTP Method | `POST` |
| URL Path | `/videos/search/click` |
| Description | Records a search query and the video the user clicked. Publishes `user.searched` Kafka event. |

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
| `resultVideoIds` | `array[string]` | Yes | IDs shown to user before click, max 50 |
| `clickedVideoId` | `string \| null` | No | ID of the video clicked. Null if user searched but didn't click |

```json
{
  "query": "kafka tutorial",
  "resultVideoIds": ["vid_k3m9p2x1", "yt_dQw4w9WgXcQ", "vid_m2n8q5r4"],
  "clickedVideoId": "vid_k3m9p2x1"
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
| `400` | `VALIDATION_ERROR` | Empty query, resultVideoIds exceeds limit |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "query must not be empty.",
    "details": []
  }
}
```

### Validation Rules
- `query`: non-empty after trim, max 200 chars
- `resultVideoIds`: max 50 items, each non-empty string
- `clickedVideoId`: optional, if provided must be a non-empty string

### Security
- Authentication required: **Yes**
- `userId` extracted from JWT

### Idempotency
- **No** — each call produces a new Kafka event.
