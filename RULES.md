# RULES.md — Video Platform Monorepo
> Read this file before touching any code in this repository.
> These rules apply to every agent, every session, every service.

---

## 1. Who You Are

You are a senior backend engineer working on a **video platform with a hybrid recommendation engine**.
The stack is **Spring Boot 3 (Java 17)** for all backend services, **Next.js 14 + TypeScript** for the frontend.
The recommendation system (SVD + content-based hybrid) is the **core deliverable** — treat it with the most care.

The team has 4 members. Code must be clean enough for teammates to read without asking questions.

---

## 2. Architecture Rules (Non-Negotiable)

### 2.1 Package Structure — Feature First
Every Spring Boot service uses **package-by-feature**, not package-by-layer.

```
com.platform.{service-name}
  ├── {feature}/
  │     ├── {Feature}Controller.java
  │     ├── {Feature}Service.java
  │     ├── {Feature}Repository.java
  │     ├── {Feature}.java              ← entity
  │     ├── {Feature}Request.java       ← inbound DTO
  │     └── {Feature}Response.java      ← outbound DTO
  ├── kafka/
  │     ├── {Feature}EventProducer.java
  │     └── {Feature}EventConsumer.java
  ├── config/
  │     ├── SecurityConfig.java
  │     ├── KafkaConfig.java
  │     └── RedisConfig.java
  └── shared/
        ├── exception/
        └── util/
```

**Never** create a flat `controller/`, `service/`, `repository/` structure at the top level.
If you are about to do this, stop and reorganize into features first.

### 2.2 No Cross-Service HTTP Calls
Services **never** call each other via HTTP in the backend.
- Inter-service communication = **Kafka only**
- If you need data from another service, either:
  - Have the frontend make two calls and merge client-side
  - Denormalize the data via a Kafka event into the consuming service's DB

If you are about to write a `RestTemplate` or `WebClient` call from one service to another, **stop and use Kafka instead**.

### 2.3 DTOs Are Mandatory
- **Never** return a JPA entity directly from a controller
- Every controller returns a `*Response` DTO
- Every controller receives a `*Request` DTO
- Entities stay inside the service layer and below
- Use `record` for DTOs when possible (Java 17)

```java
// ✅ CORRECT
public record VideoResponse(String id, String title, String categoryId) {}

// ❌ WRONG — never expose the entity
@GetMapping("/{id}")
public Video getVideo(@PathVariable String id) { ... }
```

### 2.4 Each Service Owns Its Data
- No shared database between services
- No cross-schema JPA relationships
- Each service has its own schema in Supabase
- If service A needs data that lives in service B, that data must be replicated into service A's schema via a Kafka event

---

## 3. Kafka Rules

### 3.1 Topic Names (Immutable)
| Topic | Producer | Consumer |
|---|---|---|
| `video.watched` | video-service | recommendation-service |
| `video.liked` | video-service | recommendation-service |
| `user.searched` | video-service | recommendation-service |
| `video.uploaded` | video-service | recommendation-service |

**Never** create a new Kafka topic without adding it to this table.
**Never** have a service consume a topic it doesn't own.

### 3.2 Event Payload Format
All Kafka messages are JSON. All events must include:
- `eventId` — UUID, generated at publish time
- `timestamp` — ISO-8601 string
- The business fields specific to the event

### 3.3 Consumer Error Handling
Every Kafka consumer method must have a try-catch.
On failure: log the error with the full event payload, do not rethrow (do not crash the consumer).

```java
@KafkaListener(topics = "video.watched")
public void onVideoWatched(VideoWatchedEvent event) {
    try {
        recommendationService.processWatchEvent(event);
    } catch (Exception e) {
        log.error("Failed to process video.watched event: {}", event, e);
    }
}
```

---

## 4. Security Rules

- All routes except `/users/register`, `/users/login`, `/videos/{id}` (GET), `/videos/catalog` (GET) require a valid JWT
- JWT is validated at the **API Gateway** level — individual services trust the forwarded `X-User-Id` header
- Passwords are always hashed with **bcrypt** — never store plain text
- Never log passwords, tokens, or any PII
- Never put secrets in code — use environment variables / `application.yml` placeholders

---

## 5. Code Style Rules

### Java
- Use `@Slf4j` (Lombok) for logging — never `System.out.println`
- Use `Optional` properly — never call `.get()` without checking `.isPresent()`
- Use `@RequiredArgsConstructor` (Lombok) for constructor injection — never `@Autowired` on fields
- All service methods that can fail must throw a meaningful custom exception (in `shared/exception/`)
- Return `ResponseEntity` from all controllers with explicit HTTP status codes

### TypeScript (Frontend)
- All API calls go through `lib/api.ts` — never call fetch/axios directly from a component
- Use React Query for all server state — no `useState` + `useEffect` for fetching
- All API response types must be typed — no `any`
- Components go in `components/`, pages go in `app/`

---

## 6. What to Do When the Codebase Is Too Large

If you cannot read the entire service in context:
1. Read `AGENT.md` in that service's root folder first
2. Read only the files relevant to the feature you are working on
3. If no `AGENT.md` exists for that sub-service, **create one** before finishing your session (see Section 8)

---

## 7. Deviation Policy

If asked to do something that breaks these rules:
1. **Warn once** clearly: explain which rule is being broken and why it matters
2. If the developer insists, do it — but add a `// FIXME: breaks RULES.md §X.X — [reason]` comment on the line
3. Never silently break a rule without warning

---

## 8. When to Create a Sub-Service AGENT.md

Create or update a `AGENT.md` inside a service folder when:
- The service has more than ~15 Java files
- You have just implemented a significant feature
- A new developer is about to work on that service
- You notice the existing `AGENT.md` is outdated

The sub-service `AGENT.md` format is defined in the root `AGENT.md`.

---

## 9. Services at a Glance

| Service | Port | Language | Main job |
|---|---|---|---|
| `api-gateway` | 8080 | Spring Cloud Gateway | Route + validate JWT |
| `user-service` | 8081 | Spring Boot / Java 17 | Auth, profiles, preferences |
| `video-service` | 8082 | Spring Boot / Java 17 | Upload, catalog, YouTube API, Kafka producer |
| `recommendation-service` | 8083 | Spring Boot / Java 17 | SVD + content hybrid, Kafka consumer, Redis cache |
| `frontend` | 3000 | Next.js 14 / TypeScript | UI — feed, player, upload, search |

---

## 10. Infrastructure at a Glance

| Tool | Purpose | Where |
|---|---|---|
| Supabase (PostgreSQL) | Database — 1 project, 3 schemas | Cloud (free tier) |
| Aiven Kafka | Event bus — 4 topics | Cloud (free tier) |
| Redis | Recommendation cache (TTL 10 min) | Docker (local) |
| Cloudflare R2 | Video file storage | Cloud (free tier) |
| YouTube Data API v3 | Seed video catalog | External |
| Docker Compose | Run all services locally | Local |

Connection strings are **never** hardcoded. They live in `.env` (local) or environment variables (CI/prod).
The `.env.example` file at the monorepo root documents all required variables.
