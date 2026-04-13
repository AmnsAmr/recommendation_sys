# AGENT.md -- api-gateway-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Single entry point for all client requests. Routes to the correct service, validates JWT on protected routes,
and forwards the extracted X-User-Id header. Contains minimal business logic.

---

## Current Implementation State

- [ ] Project scaffold (Spring Cloud Gateway)
- [ ] Route config for user-service
- [ ] Route config for video-service
- [ ] Route config for recommendation-service
- [ ] JWT validation filter
- [ ] X-User-Id header injection
- [ ] Internal trust signal (X-Internal-Token or mTLS)

---

## Package Structure (target)

```
org.vidrec.apigateway
  |-- filter/
  |   `-- JwtAuthFilter.java
  |-- config/
  |   `-- RouteConfig.java
  `-- ApiGatewayApplication.java
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

---

## Key Business Rules

1. JWT validation happens at the gateway.
2. On valid JWT -> strip Authorization header, add X-User-Id.
3. On invalid JWT on protected route -> return 401.
4. Service URLs come from env vars.
5. Enforce internal trust boundary (only gateway can call services).