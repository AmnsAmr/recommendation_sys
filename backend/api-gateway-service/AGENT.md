# AGENT.md -- api-gateway-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Single entry point for all client requests. Routes to the correct downstream service, validates JWT on
protected routes, strips the inbound `Authorization` header, and injects `X-User-Id`, `X-User-Role`, and
the `X-Internal-Token` so downstream services can prove the call originated at the gateway.

Built on Spring Cloud Gateway **server-webmvc** (not the reactive Gateway).

---

## Current Implementation State

- [x] Project scaffold (Spring Boot 4.0.5, Spring Cloud Gateway MVC, Spring Security, JJWT 0.12.5)
- [x] `.env` loader -- `config/DotenvEnvironmentListener` walks up to 5 parent directories
- [x] Route config for user-service (`/users/**`, `/admin/users/**`)
- [x] Route config for video-service (`/videos/**`, `/admin/videos/**`)
- [x] Route config for recommendation-service (`/recommendations/**`)
- [x] JWT validation filter (`filter/JwtAuthFilter`) using HMAC-SHA from `JWT_SECRET`
- [x] X-User-Id header injection from JWT `sub` claim
- [x] X-User-Role header injection from JWT `role` claim (defaults to `USER`)
- [x] X-Internal-Token injection from `INTERNAL_SERVICE_TOKEN` env var
- [x] `Authorization` header is stripped before forwarding
- [x] Actuator `/actuator/health` and `/actuator/info` exposed and bypass the JWT filter

---

## Package Structure (actual)

```
org.vidrec.apigateway
  |-- ApiGatewayApplication.java
  |-- config/
  |   |-- DotenvEnvironmentListener.java
  |   |-- RouteConfig.java
  |   `-- SecurityConfig.java
  `-- filter/
      `-- JwtAuthFilter.java
```

---

## Routing Rules (from `RouteConfig`)

| Incoming path | Method | Routes to | Auth |
|---|---|---|---|
| `/users/register` | POST | user-service | No |
| `/users/login` | POST | user-service | No |
| `/users/**` | * | user-service | Yes |
| `/admin/users`, `/admin/users/**` | * | user-service | Yes (admin) |
| `/videos/catalog`, `/videos/search` | GET | video-service | No |
| `/videos/{videoId}`, `/videos/user/{userId}` | GET | video-service | No |
| `/videos/**` | * | video-service | Yes |
| `/admin/videos`, `/admin/videos/**` | * | video-service | Yes (admin) |
| `/recommendations/cold/{categoryId}` | GET | recommendation-service | No |
| `/recommendations/similar/{videoId}` | GET | recommendation-service | No |
| `/recommendations/**` | * | recommendation-service | Yes |

Note: the security filter ladder (`SecurityConfig`) is fully permissive; access control is enforced
inside `JwtAuthFilter`, which only checks public-route exemptions, validates the JWT, and rewrites
headers via a `HttpServletRequestWrapper`. Admin role enforcement happens in the downstream services
(`requestMatchers("/admin/**").hasRole("ADMIN")`).

---

## Key Business Rules

1. JWT validation happens here, not in downstream services.
2. On valid JWT: drop `Authorization`, add `X-User-Id`, `X-User-Role`, `X-Internal-Token` -- forward.
3. On invalid/expired JWT on a protected route: return 401 with `UNAUTHORIZED` error envelope.
4. Downstream service URLs come from env vars `USER_SERVICE_URL`, `VIDEO_SERVICE_URL`, `REC_SERVICE_URL`
   (defaults to `http://localhost:808{1,2,3}` for local dev).
5. The internal trust boundary is enforced by `X-Internal-Token` -- downstream services reject any
   request that arrives without it, even if `X-User-Id` is present.
6. Admin endpoints are protected end-to-end: gateway validates JWT and forwards the role; downstream
   services enforce `ADMIN` via Spring Security.

---

## Files to Read First

1. `config/RouteConfig.java`
2. `filter/JwtAuthFilter.java`
3. `config/SecurityConfig.java`

---

## Known Issues / TODOs

- No mTLS; gateway-to-service trust relies entirely on `X-Internal-Token`.
- No rate limiting / circuit breakers configured on routes.
- No tests beyond the default `@SpringBootTest` context check.
