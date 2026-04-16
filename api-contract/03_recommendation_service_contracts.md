# API Contracts — Recommendation Service
> Base URL (via gateway): `http://localhost:8080`
> Direct service URL: `http://localhost:8083`
> All responses: `Content-Type: application/json`

---

## RS-01 — Get Personalized Recommendations

| Field | Value |
|---|---|
| Service | recommendation-service |
| HTTP Method | `GET` |
| URL Path | `/recommendations/{userId}` |
| Description | Returns a ranked list of publicly visible video IDs personalized for the user. Served from Redis cache when available. Cache TTL: 10 minutes. Invalidated on each new interaction event. |

### Request

**Headers**
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**

| Parameter | Type | Required | Example |
|---|---|---|---|
| `userId` | `string (UUID)` | Yes | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

**Query Parameters**

| Parameter | Type | Required | Default | Example |
|---|---|---|---|---|
| `limit` | `integer` | No | `20` | `20` |

### Response

**Success — 200 OK**

| Field | Type | Description |
|---|---|---|
| `userId` | `string (UUID)` | The user these recommendations are for |
| `strategy` | `string (enum)` | `"hybrid"` (SVD + content) or `"cold_start"` (content-based only) |
| `videoIds` | `array[string]` | Ranked video IDs — most relevant first |
| `cachedAt` | `string (ISO-8601) \| null` | When this result was cached. Null if freshly computed |
| `generatedAt` | `string (ISO-8601)` | When the recommendation was generated |

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "strategy": "hybrid",
  "videoIds": [
    "vid_k3m9p2x1",
    "yt_dQw4w9WgXcQ",
    "vid_m2n8q5r4",
    "yt_abc123xyz"
  ],
  "cachedAt": "2024-11-01T10:30:00Z",
  "generatedAt": "2024-11-01T10:30:00Z"
}
```

**Cold start example** (fewer than 5 interactions):

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "strategy": "cold_start",
  "videoIds": [
    "yt_dQw4w9WgXcQ",
    "yt_abc123xyz",
    "vid_m2n8q5r4"
  ],
  "cachedAt": null,
  "generatedAt": "2024-11-01T10:30:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid limit value |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `403` | `FORBIDDEN` | JWT userId does not match path userId |
| `404` | `USER_NOT_FOUND` | No interaction history and no preferences for this userId |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "No data found for this user. User must have at least one declared preference.",
    "details": []
  }
}
```

### Validation Rules
- `userId`: valid UUID v4
- `limit`: integer 1–100

### Security
- Authentication required: **Yes**
- User can only fetch their own recommendations (JWT userId must match path userId)

### Idempotency
- **Yes** — read-only. Returns same result within cache TTL window.

---

## RS-02 — Get Similar Videos

| Field | Value |
|---|---|
| Service | recommendation-service |
| HTTP Method | `GET` |
| URL Path | `/recommendations/similar/{videoId}` |
| Description | Returns publicly visible videos similar to a given video using item-item cosine similarity on tag/category vectors. |

### Request

**Headers**
```
(none required)
```

**Path Parameters**

| Parameter | Type | Required | Example |
|---|---|---|---|
| `videoId` | `string` | Yes | `vid_k3m9p2x1` |

**Query Parameters**

| Parameter | Type | Required | Default | Example |
|---|---|---|---|---|
| `limit` | `integer` | No | `10` | `10` |

### Response

**Success — 200 OK**

| Field | Type | Description |
|---|---|---|
| `videoId` | `string` | The reference video |
| `similarVideoIds` | `array[string]` | Ranked similar video IDs — most similar first |
| `generatedAt` | `string (ISO-8601)` | Timestamp of computation |

```json
{
  "videoId": "vid_k3m9p2x1",
  "similarVideoIds": [
    "yt_dQw4w9WgXcQ",
    "vid_m2n8q5r4",
    "yt_abc123xyz"
  ],
  "generatedAt": "2024-11-01T10:35:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid limit value |
| `404` | `VIDEO_NOT_FOUND` | No item_factor record exists for this videoId |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "VIDEO_NOT_FOUND",
    "message": "No content profile found for video 'vid_unknown'. Video may not have been indexed yet.",
    "details": []
  }
}
```

### Validation Rules
- `videoId`: non-empty string, must have an existing `item_factors` record
- `limit`: integer 1–50

### Security
- Authentication required: **No**

### Idempotency
- **Yes** — read-only, deterministic for a given item_factors state.

---

## RS-03 — Get Cold Start Recommendations

| Field | Value |
|---|---|
| Service | recommendation-service |
| HTTP Method | `GET` |
| URL Path | `/recommendations/cold/{categoryId}` |
| Description | Returns top publicly visible videos for a given category. Used for new users with no interaction history. Does not require authentication. |

### Request

**Headers**
```
(none required)
```

**Path Parameters**

| Parameter | Type | Required | Example |
|---|---|---|---|
| `categoryId` | `string` | Yes | `technology` |

**Query Parameters**

| Parameter | Type | Required | Default | Example |
|---|---|---|---|---|
| `limit` | `integer` | No | `20` | `20` |

### Response

**Success — 200 OK**

| Field | Type | Description |
|---|---|---|
| `categoryId` | `string` | The requested category |
| `videoIds` | `array[string]` | Top video IDs for this category — ordered by global popularity score |
| `generatedAt` | `string (ISO-8601)` | Timestamp |

```json
{
  "categoryId": "technology",
  "videoIds": [
    "yt_dQw4w9WgXcQ",
    "vid_k3m9p2x1",
    "yt_abc123xyz",
    "vid_m2n8q5r4"
  ],
  "generatedAt": "2024-11-01T10:30:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid limit value |
| `404` | `CATEGORY_NOT_FOUND` | No item_factors exist for this categoryId |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "No videos indexed for category 'unknown_cat'.",
    "details": []
  }
}
```

### Validation Rules
- `categoryId`: non-empty string
- `limit`: integer 1–100

### Security
- Authentication required: **No**

### Idempotency
- **Yes** — read-only.
