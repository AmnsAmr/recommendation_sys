# AGENT.md — api-gateway
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Single entry point for all client requests. Routes to the correct service, validates JWT on protected routes,
and forwards the extracted `X-User-Id` header so downstream services know who is making the request.
Contains almost no business logic — routing config only.

---

## Current Implementation State

- [ ] Project scaffold (Spring Cloud Gateway)
- [ ] Route config for user-service
- [ ] Route config for video-service
- [ ] Route config for recommendation-service
- [ ] JWT validation filter
- [ ] X-User-Id header injection

---

## Package Structure

```
com.platform.gateway
  ├── filter/
  │     └── JwtAuthFilter.java    GlobalFilter — validates JWT, injects X-User-Id
  ├── config/
  │     └── RouteConfig.java      all routing rules defined here
  └── GatewayApplication.java
```

---

## Routing Rules

| Incoming path | Routes to | Auth required |
|---|---|---|
| `/users/register` | user-service:8081 | No |
| `/users/login` | user-service:8081 | No |
| `/users/**` | user-service:8081 | Yes |
| `/videos/{id}` (GET) | video-service:8082 | No |
| `/videos/catalog` (GET) | video-service:8082 | No |
| `/videos/search` (GET) | video-service:8082 | No |
| `/videos/**` | video-service:8082 | Yes |
| `/recommendations/cold/**` | recommendation-service:8083 | No |
| `/recommendations/similar/**` | recommendation-service:8083 | No |
| `/recommendations/**` | recommendation-service:8083 | Yes |

## Key Business Rules

1. **JWT validation happens here only** — downstream services trust the `X-User-Id` header
2. **On valid JWT** → strip `Authorization` header, add `X-User-Id: {uuid}` header, forward
3. **On invalid JWT on a protected route** → return 401, do not forward
4. **On public route** → forward without any JWT check
5. **Service URLs come from env vars** — never hardcode ports in routing config

---

## Files to Read First

1. `filter/JwtAuthFilter.java` — the entire security logic lives here
2. `config/RouteConfig.java` — all routing rules
