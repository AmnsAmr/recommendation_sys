# RULES.md -- Video Platform Monorepo
> Read this file before touching any code in this repository.
> These rules apply to every agent, every session, every service.

---

## 1. Who You Are

You are a senior engineer working on a video platform with a hybrid recommendation engine.
Stack:
- Backend: Spring Boot 4.0.5 (Java 17)
- Frontend: Next.js 16.2.2 + TypeScript
- ML sidecar: FastAPI (Python)

The recommendation system (SVD + content-based hybrid) is the core deliverable.
Code must be clear enough for teammates to read without back-and-forth.

---

## 2. Architecture Rules (Non-Negotiable)

### 2.1 Package Structure -- Feature First
Every Spring Boot service uses package-by-feature, not package-by-layer.

```
org.vidrec.{service}
  |-- {feature}/
  |   |-- {Feature}Controller.java
  |   |-- {Feature}Service.java
  |   |-- {Feature}Repository.java
  |   |-- {Feature}.java              <- entity
  |   |-- {Feature}Request.java       <- inbound DTO
  |   `-- {Feature}Response.java      <- outbound DTO
  |-- kafka/
  |-- config/
  `-- shared/
```

Never create a flat controller/service/repository structure at the top level.

### 2.2 No Cross-Service HTTP Calls
Spring Boot services never call each other over HTTP.
- Inter-service communication = Kafka only
- If you need data from another service, denormalize it via events

Exception:
- recommendation-service may call svd-sidecar for ML scoring/training if needed.

### 2.3 DTOs Are Mandatory
- Never return a JPA entity from a controller
- Every controller receives a Request DTO and returns a Response DTO
- Use Java 17 records when possible

### 2.4 Each Service Owns Its Data
- No shared database between services
- No cross-schema JPA relationships
- Each service owns one schema in Supabase
- Data needed by other services must be replicated via Kafka events

### 2.5 Publish Events After Commit
All Kafka publishes must happen after DB commit.
Use a transactional outbox or AFTER_COMMIT listener.
No dual-write risk.

---

## 3. Kafka Rules

### 3.1 Topic Names (Immutable)
| Topic | Producer | Consumer |
|---|---|---|
| video.watched | video-service | recommendation-service |
| video.liked | video-service | recommendation-service |
| user.searched | video-service | recommendation-service |
| video.uploaded | video-service | recommendation-service |
| user.registered | user-service | recommendation-service |
| user.deactivated | user-service | recommendation-service |
| user.prefs.updated | user-service | recommendation-service |

Never create a new topic without updating this table.

### 3.2 Event Payload Format
All Kafka messages are JSON and must include:
- eventId (UUID)
- timestamp (ISO-8601)
- event-specific fields

### 3.3 Idempotency
Every consumer must deduplicate by eventId:
- If eventId exists in processed_events, skip
- Otherwise process and insert processed_events(event_id, processed_at)

### 3.4 Consumer Error Handling
Every Kafka consumer must have try-catch.
On failure: log error with full payload and do not crash the consumer.

---

## 4. Security Rules

- JWT is validated at the API Gateway
- Downstream services trust X-User-Id
- Services must only accept traffic from the gateway or verify an internal token
- Passwords must be BCrypt hashed
- Never log secrets or PII
- Never hardcode secrets

---

## 5. Code Style Rules

### Java
- Use @Slf4j for logging
- Prefer constructor injection (@RequiredArgsConstructor)
- Never call Optional.get() without checking
- Use ResponseEntity with explicit status codes

### TypeScript
- All API calls go through lib/api.ts
- Avoid any

---

## 6. Large Codebase Rule

If a service is large:
1. Read the service AGENT.md first
2. Read only the relevant feature package
3. If AGENT.md is missing or outdated, update it

---

## 7. Deviation Policy

If asked to break rules:
1. Warn once and explain why
2. If the developer insists, do it but add a FIXME comment referencing RULES.md

---

## 8. Services at a Glance

| Service | Port | Language | Main job |
|---|---|---|---|
| api-gateway-service | 8080 | Spring Cloud Gateway | Route + validate JWT |
| user-service | 8081 | Spring Boot | Auth, profiles, preferences |
| video-service | 8082 | Spring Boot | Upload, catalog, YouTube, Kafka producer |
| recommendation-service | 8083 | Spring Boot | Hybrid recs, Kafka consumer, Redis |
| svd-sidecar | 8000 | FastAPI | Model train/predict |
| frontend | 3000 | Next.js | UI |

---

## 9. Infrastructure at a Glance

| Tool | Purpose | Where |
|---|---|---|
| Supabase (PostgreSQL) | DB -- 1 project, 3 schemas | Cloud |
| Aiven Kafka | Event bus | Cloud |
| Redis | Rec cache | Docker |
| Cloudflare R2 | Video storage | Cloud |
| YouTube Data API | Catalog seed | External |
| Docker Compose | Local runtime | Local |

Connection strings are never hardcoded. See .env.example.

Reference sources for accuracy:
- `uml/` for architecture, flows, ERD, and folder structure diagrams
- `api-contract/` for HTTP and Kafka contracts
