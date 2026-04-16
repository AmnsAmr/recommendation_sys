# AGENT.md -- Video Platform Monorepo Root
> This file gives AI agents the full context needed to work in this codebase.
> Read this before reading any code. Then read RULES.md.
> If you are inside a specific service folder, also read the AGENT.md in that folder.

---

## What This Project Is

A video discovery platform where users watch videos (own uploads + YouTube catalog) and receive personalized recommendations powered by a hybrid engine:
- Collaborative filtering -- SVD (user-item interaction matrix)
- Content-based filtering -- cosine similarity on tag/category/language vectors

The recommendation system is the primary academic deliverable. Everything else exists to feed it.

---

## Monorepo Structure

```
video-platform/
|-- RULES.md                        <- Read first. Always.
|-- AGENT.md                        <- This file
|-- docker-compose.yml              <- Starts everything locally
|-- .env.example                    <- Required env vars documented here
|-- backend/
|   |-- api-gateway-service/        <- Spring Cloud Gateway -- port 8080
|   |   `-- AGENT.md
|   |-- user-service/               <- Spring Boot -- port 8081
|   |   `-- AGENT.md
|   |-- video-service/              <- Spring Boot -- port 8082
|   |   `-- AGENT.md
|   |-- recommendation-service/     <- Spring Boot -- port 8083
|   |   `-- AGENT.md
|   `-- svd-sidecar/                <- FastAPI sidecar -- port 8000
|-- frontend/
|   `-- web-frontend/               <- Next.js + TypeScript -- port 3000
|       `-- AGENT.md
|-- api-contract/
|-- uml/
```

Primary references:
- `uml/` for architecture, flows, ERD, and folder structure diagrams
- `api-contract/` for HTTP and Kafka contracts

---

## How to Navigate This Codebase as an Agent

### Step 1 -- Identify which service you need to touch

| Task involves... | Service to open |
|---|---|
| Login, register, JWT, user profile | `user-service` |
| Upload video, watch event, like, search, YouTube sync, admin moderation | `video-service` |
| Admin user management, bans, role-aware JWTs, user dashboard metrics | `user-service` |
| Comment moderation | Not implemented in this repo yet -- plan it as an admin-owned feature when a comment service/domain is added |
| Recommendation feed, Kafka consumers, Redis cache | `recommendation-service` |
| Routing, JWT validation at gateway level | `api-gateway-service` |
| UI page, component, API call from browser | `frontend/web-frontend` |
| Model training / inference | `svd-sidecar` |

### Step 2 -- Read the service's AGENT.md
Each service has its own AGENT.md that describes its features, current state, and what is left to implement.

### Step 3 -- Read only the relevant feature package
Do not read the entire service. Read only the feature package relevant to your task.

### Step 4 -- Apply changes following RULES.md
Before writing code, confirm:
- Am I using package-by-feature? yes
- Am I returning a DTO, not an entity? yes
- Am I using Kafka, not HTTP, for inter-service side effects? yes
- Am I reading from/writing to the correct service schema? yes
- Am I enforcing admin-only routes with role-aware auth? yes
- Am I keeping platform uploads private until admin approval? yes

---

## The Recommendation Engine -- Agent Must Understand This

### Signal to Score Mapping
Every user action becomes a numeric score stored in the `interactions` table:

| Event | Kafka Topic | Score Formula |
|---|---|---|
| Watch 0-20% | `video.watched` | `0.1` |
| Watch 20-60% | `video.watched` | `completionPct * 0.8` |
| Watch 60-100% | `video.watched` | `completionPct * 1.0` |
| Like | `video.liked` | `+1.0` |
| Dislike | `video.liked` | `-1.0` |
| Search + click | `user.searched` | `+0.5` |

### Hybrid Score Formula
```
final_score = (0.6 * svd_score) + (0.4 * content_score)
```
Both scores normalized to [0, 1] before combining.

### Cold Start Logic
- New user (fewer than 5 interactions) -> content-based only using declared category preferences
- User with 5+ interactions -> hybrid (SVD + content-based)

### Redis Cache Pattern
```
Key:   rec:{userId}
Value: JSON array of videoIds
TTL:   10 minutes
```
Cache is invalidated every time a new interaction event arrives for that user.

---

## Kafka Topics -- Full Reference

| Topic | Payload Fields | Producer | Consumer |
|---|---|---|---|
| `video.watched` | eventId, userId, videoId, watchDuration, videoDuration, completionPct, source, timestamp | video-service | recommendation-service |
| `video.liked` | eventId, userId, videoId, action, source, timestamp | video-service | recommendation-service |
| `user.searched` | eventId, userId, query, resultVideoIds, clickedVideoId, timestamp | video-service | recommendation-service |
| `video.uploaded` | eventId, videoId, title, description, tags, categoryId, thumbnailUrl, language, source, timestamp | video-service | recommendation-service |
| `user.events` | eventId, userId, eventType, username?, interests?, preferences?, reason?, timestamp | user-service | recommendation-service |

All events must be idempotent: check `processed_events` by eventId before processing.

---

## Database Schemas -- Full Reference (v2)

One Supabase project, three schemas. No cross-schema queries in application code.

### user_schema
```sql
users(id UUID PK, email VARCHAR UNIQUE, password_hash VARCHAR,
      username VARCHAR UNIQUE, display_name VARCHAR, role VARCHAR,
      bio TEXT, profile_picture_url VARCHAR, is_active BOOLEAN,
      banned_at TIMESTAMP, ban_reason VARCHAR,
      created_at TIMESTAMP, updated_at TIMESTAMP)

user_preferences(id UUID PK, user_id UUID FK, category VARCHAR,
      weight FLOAT, created_at TIMESTAMP, updated_at TIMESTAMP)
```

### video_schema
```sql
videos(id VARCHAR PK, title VARCHAR, description TEXT, category_id VARCHAR FK,
       duration INTEGER, source ENUM(own,youtube), youtube_id VARCHAR,
       uploader_id UUID, s3_key VARCHAR, thumbnail_url VARCHAR,
       view_count BIGINT, like_count BIGINT, dislike_count BIGINT,
       language VARCHAR(10), status ENUM(pending,processing,under_review,ready,rejected,failed),
       moderation_notes VARCHAR, reviewed_by UUID, reviewed_at TIMESTAMP,
       published_at TIMESTAMP, created_at TIMESTAMP, updated_at TIMESTAMP)

video_tags(video_id VARCHAR FK, tag VARCHAR, PRIMARY KEY(video_id, tag))
categories(id VARCHAR PK, name VARCHAR)
watch_sessions(id UUID PK, user_id UUID, video_id VARCHAR, watch_duration INT,
       video_duration INT, completion_pct FLOAT, rewatch_count INT, source ENUM(own,youtube))
video_outbox(id UUID PK, aggregate_type VARCHAR, aggregate_id VARCHAR,
       topic VARCHAR, payload JSONB, status VARCHAR, created_at TIMESTAMP)
```

### recommendation_schema
```sql
interactions(id UUID PK, user_id UUID, video_id VARCHAR,
       event_type ENUM(watch,like,dislike,search_click,rewatch),
       score FLOAT, completion_pct FLOAT, created_at TIMESTAMP)
user_factors(user_id UUID PK, vector FLOAT[], updated_at TIMESTAMP)
item_factors(video_id VARCHAR PK, vector FLOAT[], tags TEXT[],
       category_id VARCHAR, thumbnail_url VARCHAR, language VARCHAR(10),
       view_count BIGINT, global_score FLOAT, updated_at TIMESTAMP)
user_category_profiles(id UUID PK, user_id UUID, category VARCHAR,
       weight FLOAT, source ENUM(declared,inferred), updated_at TIMESTAMP)
processed_events(event_id VARCHAR PK, processed_at TIMESTAMP)
```

---

## Environment Variables -- Full List

See `.env.example` for the authoritative list. Key ones:

```
JWT_SECRET=
JWT_EXPIRATION_MS=
SUPABASE_DB_URL_USER=
SUPABASE_DB_URL_VIDEO=
SUPABASE_DB_URL_REC=
SUPABASE_DB_USERNAME=
SUPABASE_DB_PASSWORD=
KAFKA_BOOTSTRAP_SERVERS=
KAFKA_SASL_USERNAME=
KAFKA_SASL_PASSWORD=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
YOUTUBE_API_KEY=
SVD_SIDECAR_URL=http://svd-sidecar:8000
```

---

## API Endpoints -- Full Reference

### User Service (via gateway: /users/**)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/users/register` | None | Create account (emits user.registered) |
| POST | `/users/login` | None | Returns JWT |
| GET | `/users/{id}/profile` | JWT | Get profile |
| PUT | `/users/{id}/preferences` | JWT | Update category preferences |
| PUT | `/users/{id}/profile` | JWT | Update profile fields |
| GET | `/admin/users/dashboard` | Admin JWT | User/admin dashboard metrics |
| GET | `/admin/users` | Admin JWT | List users for moderation |
| PUT | `/admin/users/{id}/ban` | Admin JWT | Ban a user |
| DELETE | `/admin/users/{id}` | Admin JWT | Delete a user |

### Video Service (via gateway: /videos/**)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/videos/init` | JWT | Init upload, returns videoId + token |
| PUT | `/videos/{id}/upload` | JWT | Upload file (multipart), leaves video under review |
| GET | `/videos/{id}` | None | Get video metadata |
| GET | `/videos/user/{userId}` | None | Get all videos by uploader |
| GET | `/videos/search` | None | Search by keyword |
| GET | `/videos/catalog` | None | Full catalog browse (supports language filter) |
| POST | `/videos/watch` | JWT | Record watch event |
| POST | `/videos/{id}/like` | JWT | Like or dislike |
| POST | `/videos/search/click` | JWT | Search click tracking |
| GET | `/admin/videos/dashboard` | Admin JWT | Video moderation dashboard metrics |
| GET | `/admin/videos/pending` | Admin JWT | Review queue |
| POST | `/admin/videos/{id}/approve` | Admin JWT | Make uploaded video public |
| POST | `/admin/videos/{id}/reject` | Admin JWT | Reject uploaded video |

### Recommendation Service (via gateway: /recommendations/**)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/recommendations/{userId}` | JWT | Personalized feed (cached) |
| GET | `/recommendations/similar/{videoId}` | None | Similar videos |
| GET | `/recommendations/cold/{categoryId}` | None | Cold start by category |

---

## Trust Boundary

The gateway validates JWT and forwards `X-User-Id` plus `X-User-Role`. Services must only accept traffic from the gateway and/or verify an internal auth signal (X-Internal-Token or mTLS). Do not expose service ports publicly.

---

## Common Mistakes -- Agents Must Avoid These

| Mistake | Correct approach |
|---|---|
| Returning a JPA entity from a controller | Map to a Response DTO first |
| Calling another service via HTTP | Publish a Kafka event instead |
| Putting all classes in controller/service/repository root | Use feature packages |
| Hardcoding connection strings | Use env vars in config |
| Calling get() on Optional without check | Use orElseThrow() or ifPresent() |
| Catching exception and doing nothing | Log it with payload |
| Joining across service schemas | Never |
