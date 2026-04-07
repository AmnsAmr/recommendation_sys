# AGENT.md — Video Platform Monorepo Root
> This file gives AI agents the full context needed to work in this codebase.
> Read this before reading any code. Then read RULES.md.
> If you are inside a specific service folder, also read the AGENT.md in that folder.

---

## What This Project Is

A video discovery platform where users watch videos (own uploads + YouTube catalog) and receive **personalized recommendations** powered by a hybrid engine combining:
- **Collaborative filtering** — SVD (Singular Value Decomposition) on the user-item interaction matrix
- **Content-based filtering** — cosine similarity on tag/category vectors

The recommendation system is the **primary academic deliverable**. Everything else exists to feed it.

---

## Monorepo Structure

```
video-platform/
├── RULES.md                        ← Read first. Always.
├── AGENT.md                        ← This file
├── docker-compose.yml              ← Starts everything locally
├── .env.example                    ← All required env vars documented here
├── backend/
│   ├── api-gateway/                ← Spring Cloud Gateway — port 8080
│   │   └── AGENT.md               ← Read when working on gateway
│   ├── user-service/               ← Spring Boot — port 8081
│   │   └── AGENT.md               ← Read when working on auth/users
│   ├── video-service/              ← Spring Boot — port 8082
│   │   └── AGENT.md               ← Read when working on videos/upload
│   └── recommendation-service/    ← Spring Boot — port 8083
│       └── AGENT.md               ← Read when working on recommendations
└── frontend/
    └── next-app/                   ← Next.js 14 + TypeScript — port 3000
        └── AGENT.md               ← Read when working on UI
```

---

## How to Navigate This Codebase as an Agent

### Step 1 — Identify which service you need to touch
Read the task. Map it to a service using this table:

| Task involves... | Service to open |
|---|---|
| Login, register, JWT, user profile | `user-service` |
| Upload video, watch event, like, search, YouTube sync | `video-service` |
| Recommendation feed, SVD, content similarity, Redis cache | `recommendation-service` |
| Routing, JWT validation at gateway level | `api-gateway` |
| UI page, component, API call from browser | `frontend/next-app` |

### Step 2 — Read the service's AGENT.md
Each service has its own `AGENT.md` that describes its features, current state, and what is left to implement.

### Step 3 — Read only the relevant feature package
Do not read the entire service. Read only the feature package relevant to your task.

### Step 4 — Apply changes following RULES.md
Before writing code, confirm:
- Am I using package-by-feature? ✓
- Am I returning a DTO, not an entity? ✓
- Am I using Kafka, not HTTP, for inter-service communication? ✓
- Am I reading from/writing to the correct service's schema? ✓

---

## The Recommendation Engine — Agent Must Understand This

This is the most important part of the system. Read carefully.

### Signal → Score Mapping
Every user action becomes a numeric score stored in the `interactions` table:

| Event | Kafka Topic | Score Formula |
|---|---|---|
| Watch 0–20% | `video.watched` | `0.1` (weak negative — likely disinterest) |
| Watch 20–60% | `video.watched` | `completionPct × 0.8` |
| Watch 60–100% | `video.watched` | `completionPct × 1.0` (strong positive) |
| Like | `video.liked` | `+1.0` |
| Dislike | `video.liked` | `-1.0` |
| Search + click | `user.searched` | `+0.5` |

### Hybrid Score Formula
```
final_score = (0.6 × svd_score) + (0.4 × content_score)
```
Both scores normalized to [0, 1] before combining.
SVD weight is higher because it captures implicit cross-user patterns.

### Cold Start Logic
- New user (fewer than 5 interactions) → **content-based only** using declared category preferences
- User with 5+ interactions → **hybrid** (SVD + content-based)
- This transition is automatic based on `interactions` table row count for that user

### Redis Cache Pattern
```
Key:   rec:{userId}
Value: JSON array of videoIds  e.g. ["yt_abc123", "own_xyz789", ...]
TTL:   10 minutes
```
Cache is **invalidated** (deleted) every time a new interaction event arrives for that user.
Cache is **populated** on the first recommendation request after invalidation.

---

## Kafka Topics — Full Reference

| Topic | Payload Fields | Who Produces | Who Consumes |
|---|---|---|---|
| `video.watched` | `eventId, userId, videoId, watchDuration, videoDuration, completionPct, source, timestamp` | video-service | recommendation-service |
| `video.liked` | `eventId, userId, videoId, action (like\|dislike), source, timestamp` | video-service | recommendation-service |
| `user.searched` | `eventId, userId, query, resultVideoIds[], clickedVideoId, timestamp` | video-service | recommendation-service |
| `video.uploaded` | `eventId, videoId, title, description, tags[], categoryId, source (own\|youtube), timestamp` | video-service | recommendation-service |

**Aiven Kafka** is used (cloud, free tier). Connection config is in each service's `application.yml` via env vars.

---

## Database Schemas — Full Reference

**One Supabase project, three schemas. No cross-schema queries in application code.**

### user_schema
```sql
users(id UUID PK, email VARCHAR UNIQUE, password_hash VARCHAR, username VARCHAR, created_at TIMESTAMP)
user_preferences(id UUID PK, user_id UUID FK, category VARCHAR, weight FLOAT, updated_at TIMESTAMP)
```

### video_schema
```sql
videos(id VARCHAR PK, title VARCHAR, description TEXT, category_id VARCHAR FK,
       duration INTEGER, source ENUM(own,youtube), youtube_id VARCHAR,
       uploader_id UUID, s3_key VARCHAR, status ENUM(pending,ready), created_at TIMESTAMP)
video_tags(video_id VARCHAR FK, tag VARCHAR, PRIMARY KEY(video_id, tag))
categories(id VARCHAR PK, name VARCHAR)
```

### recommendation_schema
```sql
interactions(id UUID PK, user_id UUID, video_id VARCHAR, event_type ENUM, score FLOAT, created_at TIMESTAMP)
user_factors(user_id UUID PK, vector FLOAT[], updated_at TIMESTAMP)
item_factors(video_id VARCHAR PK, vector FLOAT[], tags TEXT[], category_id VARCHAR, updated_at TIMESTAMP)
```

---

## Environment Variables — Full List

All services read from environment variables. Never hardcode. The `.env.example` at root documents all of these:

```bash
# Supabase
SUPABASE_URL=
SUPABASE_DB_URL=jdbc:postgresql://...
SUPABASE_DB_USERNAME=
SUPABASE_DB_PASSWORD=

# Aiven Kafka
KAFKA_BOOTSTRAP_SERVERS=
KAFKA_SASL_USERNAME=
KAFKA_SASL_PASSWORD=

# Redis (local Docker)
REDIS_HOST=localhost
REDIS_PORT=6379

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=https://{account_id}.r2.cloudflarestorage.com

# YouTube API
YOUTUBE_API_KEY=

# JWT
JWT_SECRET=
JWT_EXPIRATION_MS=86400000

# Service ports
USER_SERVICE_PORT=8081
VIDEO_SERVICE_PORT=8082
REC_SERVICE_PORT=8083
```

---

## API Endpoints — Full Reference

### User Service (via gateway: /users/**)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/users/register` | None | Create account |
| POST | `/users/login` | None | Returns JWT |
| GET | `/users/{id}/profile` | JWT | Get profile |
| PUT | `/users/{id}/preferences` | JWT | Update category preferences |

### Video Service (via gateway: /videos/**)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/videos/init` | JWT | Init upload, returns videoId + token |
| PUT | `/videos/{id}/upload` | JWT | Upload file (multipart) |
| GET | `/videos/{id}` | None | Get video metadata |
| GET | `/videos/user/{userId}` | None | Get all videos by uploader |
| GET | `/videos/search?q=` | None | Search by keyword |
| GET | `/videos/catalog` | None | Full catalog browse |
| POST | `/videos/watch` | JWT | Record watch event |
| POST | `/videos/{id}/like` | JWT | Like or dislike |

### Recommendation Service (via gateway: /recommendations/**)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/recommendations/{userId}` | JWT | Personalized feed (cached) |
| GET | `/recommendations/similar/{videoId}` | None | Similar videos |
| GET | `/recommendations/cold/{categoryId}` | None | Cold start by category |

---

## How to Write a Sub-Service AGENT.md

When a service grows large or a new teammate joins, create/update `AGENT.md` inside that service folder using this template:

```markdown
# AGENT.md — {Service Name}

## What This Service Does
One paragraph. Be specific.

## Current Implementation State
List what is DONE and what is TODO:
- [x] Feature A — fully implemented
- [x] Feature B — implemented, needs tests
- [ ] Feature C — not started
- [ ] Feature D — in progress (see VideoUploadService.java)

## Package Structure
{feature}/
  {Feature}Controller.java — endpoints: GET /..., POST /...
  {Feature}Service.java    — business logic lives here
  ...

## Key Business Rules
Bullet list of things an agent MUST know to avoid breaking logic.
E.g. "completionPct below 0.2 is treated as a negative signal"

## Known Issues / TODOs
- FIXME in VideoService.java line 87 — edge case not handled
- YouTube sync does not handle rate limiting yet

## Files to Read First
List the 3-5 most important files in this service for context.
```

---

## Prompt Templates for Codex CLI

Use these when starting a Codex session. Copy, fill in the blank, send.

### Starting a new feature
```
Read RULES.md and AGENT.md at the repo root, then read backend/{service-name}/AGENT.md.
I want to implement: [DESCRIBE FEATURE].
The feature belongs in the [FEATURE NAME] package of [SERVICE NAME].
Follow package-by-feature structure. Return DTOs only. Use Kafka for any cross-service side effects.
Show me the plan before writing any code.
```

### Fixing a bug
```
Read RULES.md and backend/{service-name}/AGENT.md.
There is a bug in [CLASS NAME] / [FEATURE PACKAGE].
Symptoms: [DESCRIBE WHAT IS WRONG].
Do not refactor anything outside the affected class unless necessary.
Explain the cause before proposing a fix.
```

### Adding a Kafka consumer
```
Read RULES.md and backend/recommendation-service/AGENT.md.
I need to handle a new Kafka event: topic=[TOPIC], payload=[FIELDS].
Create the event record class, the @KafkaListener method, wrap in try-catch per RULES.md §3.3.
The consumer should: [DESCRIBE WHAT IT SHOULD DO WITH THE EVENT].
```

### Writing a new API endpoint
```
Read RULES.md and backend/{service-name}/AGENT.md.
Add a new endpoint: [METHOD] [PATH].
Request body / params: [DESCRIBE].
Response: [DESCRIBE].
Create Request DTO, Response DTO, controller method, service method, repository method if needed.
Follow package-by-feature. No entity exposure.
```

### Asking for a code review
```
Read RULES.md.
Review the following code for violations of our architecture rules.
Focus on: DTO exposure, cross-service calls, package structure, Kafka error handling.
[PASTE CODE]
```

---

## Common Mistakes — Agents Must Avoid These

| Mistake | Correct approach |
|---|---|
| Returning a JPA entity from a controller | Map to a `*Response` record first |
| Calling another service via `RestTemplate` | Publish a Kafka event instead |
| Putting all classes in `controller/`, `service/`, `repository/` packages | Use feature packages |
| Hardcoding connection strings | Use `${ENV_VAR}` in `application.yml` |
| Calling `.get()` on an `Optional` without checking | Use `.orElseThrow()` or `.ifPresent()` |
| Using `@Autowired` on fields | Use `@RequiredArgsConstructor` with `final` fields |
| Catching an exception and doing nothing | Log it with the full event payload |
| Writing business logic in a controller | Controllers only validate input and delegate to service |
| Joining across service schemas in SQL | Never. Each service queries only its own schema. |
