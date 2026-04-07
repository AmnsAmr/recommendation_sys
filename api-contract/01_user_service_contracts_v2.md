# API Contracts — User Service (v2)
> Base URL (via gateway): `http://localhost:8080`
> Direct service URL: `http://localhost:8081`
> All responses: `Content-Type: application/json`
> v2 changes: register accepts interests + displayName, profile response includes new fields, new US-05 update profile endpoint

---

## US-01 — Register

| Field | Value |
|---|---|
| Service | user-service |
| HTTP Method | `POST` |
| URL Path | `/users/register` |
| Description | Creates a new user account. Accepts initial interests from signup form for immediate cold start recommendations. Returns JWT so user is logged in immediately after registering. Emits `user.registered` Kafka event. |

### Request

**Headers**
```
Content-Type: application/json
```

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | `string` | Yes | Valid email format, max 255 chars, unique |
| `password` | `string` | Yes | Min 8 chars, max 72 chars |
| `username` | `string` | Yes | Min 3, max 50 chars, regex `^[a-zA-Z0-9_]+$` |
| `displayName` | `string` | Yes | Min 2, max 100 chars, any characters allowed |
| `interests` | `array[string]` | Yes | Min 1, max 10 items — category IDs from the interest form |

```json
{
  "email": "alice@example.com",
  "password": "securePass123",
  "username": "alice_dev",
  "displayName": "Alice",
  "interests": ["technology", "science", "programming"]
}
```

### Response

**Success — 201 Created**

| Field | Type | Description |
|---|---|---|
| `token` | `string` | JWT — user is logged in immediately |
| `userId` | `string (UUID)` | Created user's ID |
| `username` | `string` | Username |
| `displayName` | `string` | Display name |
| `expiresIn` | `integer` | Token TTL in seconds |

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "alice_dev",
  "displayName": "Alice",
  "expiresIn": 86400
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing field, constraint violated |
| `409` | `EMAIL_ALREADY_EXISTS` | Email already registered |
| `409` | `USERNAME_ALREADY_EXISTS` | Username already taken |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "USERNAME_ALREADY_EXISTS",
    "message": "This username is already taken.",
    "details": []
  }
}
```

### Validation Rules
- `email`: RFC 5322 format, max 255 chars
- `password`: min 8, max 72 chars, no whitespace-only
- `username`: regex `^[a-zA-Z0-9_]{3,50}$`, unique
- `displayName`: min 2, max 100 chars, trimmed
- `interests`: min 1 item, max 10 items, each must be a known categoryId

### Security
- Authentication required: **No**

### Idempotency
- **No** — repeated calls with same email or username return `409`.

---

## US-02 — Login

| Field | Value |
|---|---|
| Service | user-service |
| HTTP Method | `POST` |
| URL Path | `/users/login` |
| Description | Authenticates a user and returns a signed JWT. |

### Request

**Headers**
```
Content-Type: application/json
```

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | `string` | Yes | Valid email format |
| `password` | `string` | Yes | Non-empty |

```json
{
  "email": "alice@example.com",
  "password": "securePass123"
}
```

### Response

**Success — 200 OK**

| Field | Type | Description |
|---|---|---|
| `token` | `string` | Signed JWT |
| `userId` | `string (UUID)` | Authenticated user's ID |
| `username` | `string` | Username |
| `displayName` | `string` | Display name |
| `expiresIn` | `integer` | Token TTL in seconds |

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "alice_dev",
  "displayName": "Alice",
  "expiresIn": 86400
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing field |
| `401` | `INVALID_CREDENTIALS` | Email not found or wrong password |
| `403` | `ACCOUNT_INACTIVE` | Account has been deactivated |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect.",
    "details": []
  }
}
```

### Validation Rules
- `email`: non-empty, valid format
- `password`: non-empty

### Security
- Authentication required: **No**

### Idempotency
- **Yes** — same credentials always produce a valid token.

---

## US-03 — Get User Profile

| Field | Value |
|---|---|
| Service | user-service |
| HTTP Method | `GET` |
| URL Path | `/users/{userId}/profile` |
| Description | Returns the full profile of a user including display name, bio, avatar, and preferences. |

### Request

**Headers**
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**

| Parameter | Type | Required | Example |
|---|---|---|---|
| `userId` | `string (UUID)` | Yes | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

### Response

**Success — 200 OK**

| Field | Type | Description |
|---|---|---|
| `userId` | `string (UUID)` | User ID |
| `username` | `string` | Login username |
| `displayName` | `string` | Public display name |
| `bio` | `string \| null` | Short biography |
| `profilePictureUrl` | `string \| null` | URL to avatar image |
| `email` | `string` | Email address |
| `preferences` | `array` | Category preferences |
| `preferences[].category` | `string` | Category ID |
| `preferences[].weight` | `number` | Preference weight 0.0–1.0 |
| `isActive` | `boolean` | Whether account is active |
| `createdAt` | `string (ISO-8601)` | Account creation date |
| `updatedAt` | `string (ISO-8601)` | Last profile update |

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "alice_dev",
  "displayName": "Alice",
  "bio": "Backend developer, coffee enthusiast.",
  "profilePictureUrl": "https://pub-xxx.r2.dev/avatars/alice.jpg",
  "email": "alice@example.com",
  "preferences": [
    { "category": "technology", "weight": 0.9 },
    { "category": "science", "weight": 0.6 }
  ],
  "isActive": true,
  "createdAt": "2024-11-01T10:30:00Z",
  "updatedAt": "2024-11-02T14:00:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `403` | `FORBIDDEN` | JWT userId does not match path userId |
| `404` | `USER_NOT_FOUND` | No user with this ID |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Validation Rules
- `userId`: valid UUID v4

### Security
- Authentication required: **Yes**
- User can only fetch their own profile

### Idempotency
- **Yes** — read-only.

---

## US-04 — Update Preferences

| Field | Value |
|---|---|
| Service | user-service |
| HTTP Method | `PUT` |
| URL Path | `/users/{userId}/preferences` |
| Description | Replaces all category preferences for a user. Full replace -- previous preferences deleted. Emits `user.prefs.updated` Kafka event. |

### Request

**Headers**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Path Parameters**

| Parameter | Type | Required | Example |
|---|---|---|---|
| `userId` | `string (UUID)` | Yes | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `preferences` | `array` | Yes | Min 1, max 10 items |
| `preferences[].category` | `string` | Yes | Non-empty, max 100 chars |
| `preferences[].weight` | `number (float)` | Yes | 0.0 to 1.0 inclusive |

```json
{
  "preferences": [
    { "category": "technology", "weight": 0.9 },
    { "category": "science", "weight": 0.6 }
  ]
}
```

### Response

**Success — 200 OK**

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "preferences": [
    { "category": "technology", "weight": 0.9 },
    { "category": "science", "weight": 0.6 }
  ],
  "updatedAt": "2024-11-01T11:00:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid weight, empty array, duplicate categories |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `403` | `FORBIDDEN` | JWT userId does not match path userId |
| `404` | `USER_NOT_FOUND` | No user with this ID |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Validation Rules
- `preferences`: array, min 1, max 10 elements
- `preferences[].category`: non-empty, max 100 chars, trimmed, no duplicates
- `preferences[].weight`: float `>= 0.0` and `<= 1.0`

### Security
- Authentication required: **Yes**

### Idempotency
- **Yes** — full replace semantics, same payload = same state.

---

## US-05 — Update Profile (NEW)

| Field | Value |
|---|---|
| Service | user-service |
| HTTP Method | `PUT` |
| URL Path | `/users/{userId}/profile` |
| Description | Updates display name, bio, and profile picture URL. Does not change email, username, or password. |

### Request

**Headers**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Path Parameters**

| Parameter | Type | Required | Example |
|---|---|---|---|
| `userId` | `string (UUID)` | Yes | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `displayName` | `string` | No | Min 2, max 100 chars |
| `bio` | `string` | No | Max 300 chars |
| `profilePictureUrl` | `string` | No | Valid URL, max 2048 chars |

```json
{
  "displayName": "Alice Dev",
  "bio": "Backend developer, coffee enthusiast.",
  "profilePictureUrl": "https://pub-xxx.r2.dev/avatars/alice.jpg"
}
```

### Response

**Success — 200 OK**

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "alice_dev",
  "displayName": "Alice Dev",
  "bio": "Backend developer, coffee enthusiast.",
  "profilePictureUrl": "https://pub-xxx.r2.dev/avatars/alice.jpg",
  "updatedAt": "2024-11-02T14:00:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Field constraint violated |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `403` | `FORBIDDEN` | JWT userId does not match path userId |
| `404` | `USER_NOT_FOUND` | No user with this ID |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Validation Rules
- At least one field must be present
- `displayName`: min 2, max 100 chars after trim
- `bio`: max 300 chars
- `profilePictureUrl`: valid URL format if provided

### Security
- Authentication required: **Yes**

### Idempotency
- **Yes** — same payload produces same result.
