# API Contracts — User Service
> Base URL (via gateway): `http://localhost:8080`
> Direct service URL: `http://localhost:8081`
> All responses: `Content-Type: application/json`

---

## US-01 — Register

| Field | Value |
|---|---|
| Service | user-service |
| HTTP Method | `POST` |
| URL Path | `/users/register` |
| Description | Creates a new user account. Returns the created user's ID. |

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
| `username` | `string` | Yes | Min 3 chars, max 50 chars, alphanumeric + underscores only |

```json
{
  "email": "alice@example.com",
  "password": "securePass123",
  "username": "alice_dev"
}
```

### Response

**Success — 201 Created**

| Field | Type | Description |
|---|---|---|
| `userId` | `string (UUID)` | Created user's ID |
| `username` | `string` | Registered username |
| `email` | `string` | Registered email |
| `createdAt` | `string (ISO-8601)` | Account creation timestamp |

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "alice_dev",
  "email": "alice@example.com",
  "createdAt": "2024-11-01T10:30:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing field, invalid format, constraint violated |
| `409` | `EMAIL_ALREADY_EXISTS` | Email already registered |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "An account with this email already exists.",
    "details": []
  }
}
```

### Validation Rules
- `email`: RFC 5322 format, max 255 chars
- `password`: min 8 chars, max 72 chars (bcrypt limit), no whitespace-only strings
- `username`: regex `^[a-zA-Z0-9_]{3,50}$`

### Security
- Authentication required: **No**

### Idempotency
- **No** — repeated calls with same email return `409`.

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
| `token` | `string` | Signed JWT — include as `Bearer` in subsequent requests |
| `userId` | `string (UUID)` | Authenticated user's ID |
| `username` | `string` | Authenticated user's username |
| `expiresIn` | `integer` | Token TTL in seconds (86400 = 24h) |

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "alice_dev",
  "expiresIn": 86400
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing field |
| `401` | `INVALID_CREDENTIALS` | Email not found or password mismatch |
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
- **Yes** — same credentials always return a valid token (new token issued each call).

---

## US-03 — Get User Profile

| Field | Value |
|---|---|
| Service | user-service |
| HTTP Method | `GET` |
| URL Path | `/users/{userId}/profile` |
| Description | Returns the public profile and preferences of a user. |

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
| `username` | `string` | Username |
| `email` | `string` | Email address |
| `preferences` | `array` | List of category preferences |
| `preferences[].category` | `string` | Category name |
| `preferences[].weight` | `number (float)` | Preference weight 0.0–1.0 |
| `createdAt` | `string (ISO-8601)` | Account creation date |

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "alice_dev",
  "email": "alice@example.com",
  "preferences": [
    { "category": "technology", "weight": 0.9 },
    { "category": "science", "weight": 0.6 }
  ],
  "createdAt": "2024-11-01T10:30:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `403` | `FORBIDDEN` | JWT userId does not match path userId |
| `404` | `USER_NOT_FOUND` | No user with this ID |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "No user found with the provided ID.",
    "details": []
  }
}
```

### Validation Rules
- `userId`: must be a valid UUID v4

### Security
- Authentication required: **Yes**
- User can only fetch their own profile (JWT userId must match path userId)

### Idempotency
- **Yes** — read-only, no state change.

---

## US-04 — Update Preferences

| Field | Value |
|---|---|
| Service | user-service |
| HTTP Method | `PUT` |
| URL Path | `/users/{userId}/preferences` |
| Description | Replaces all category preferences for a user. Previous preferences are deleted. |

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
| `preferences` | `array` | Yes | Min 1 item, max 10 items |
| `preferences[].category` | `string` | Yes | Non-empty, max 100 chars |
| `preferences[].weight` | `number (float)` | Yes | 0.0 to 1.0 inclusive |

```json
{
  "preferences": [
    { "category": "technology", "weight": 0.9 },
    { "category": "science", "weight": 0.6 },
    { "category": "education", "weight": 0.4 }
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
    { "category": "science", "weight": 0.6 },
    { "category": "education", "weight": 0.4 }
  ],
  "updatedAt": "2024-11-01T11:00:00Z"
}
```

**Errors**

| Status | Code | Trigger |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid weight value, empty preferences array |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `403` | `FORBIDDEN` | JWT userId does not match path userId |
| `404` | `USER_NOT_FOUND` | No user with this ID |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Preference weight must be between 0.0 and 1.0.",
    "details": [
      { "field": "preferences[1].weight", "issue": "Value 1.5 exceeds maximum of 1.0" }
    ]
  }
}
```

### Validation Rules
- `preferences`: array, min 1, max 10 elements
- `preferences[].category`: non-empty string, max 100 chars, trimmed
- `preferences[].weight`: float, must be `>= 0.0` and `<= 1.0`
- Duplicate categories in same request: rejected with `VALIDATION_ERROR`

### Security
- Authentication required: **Yes**
- User can only update their own preferences

### Idempotency
- **Yes** — repeated calls with same payload produce the same state (full replace semantics).
