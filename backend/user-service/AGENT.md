# AGENT.md -- user-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Handles user registration, login, JWT generation, profile management, and category preferences.
Emits user lifecycle events to Kafka (`user.events`) for cold-start recommendations and downstream
cache invalidation. Owns platform roles (`USER`, `ADMIN`), admin user moderation, and the admin user
dashboard metrics.

---

## Current Implementation State

- [x] Project scaffold (Spring Boot 4.0.5, JPA, Security, Kafka, Validation, JJWT 0.12.5, BCrypt)
- [x] `User` entity + repository, `UserPreference` entity + repository (schema=`user_schema`)
- [x] POST `/users/register` -- BCrypt hash, saves declared `interests` as preferences, emits `user.events` type=`registered`, returns JWT
- [x] POST `/users/login` -- validates password, rejects `banned` / `inactive` accounts with explicit codes, returns JWT
- [x] GET `/users/{id}/profile` -- self-only check via `assertOwner` (JWT user id must match path)
- [x] PUT `/users/{id}/profile` -- self-only, partial update of display name / bio / picture
- [x] PUT `/users/{id}/preferences` -- self-only, replaces preferences and emits `prefs_updated`
- [x] `UserService.deactivateUser()` exists and emits `deactivated` -- **no HTTP endpoint is exposed yet**
- [x] Admin endpoints: dashboard, list (filter by `active` / `role`), get, update, ban, unban, delete
- [x] Admin self-protection: cannot ban / delete / demote own account
- [x] Admin bootstrap: `AdminBootstrapRunner` seeds an admin on startup when `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars are set
- [x] Password hashing (BCrypt) + JWT utility (HS256, role claim included)
- [x] `HeaderAuthFilter` -- accepts requests only if `X-Internal-Token` matches `INTERNAL_SERVICE_TOKEN` (or synthesizes auth when `APP_SECURITY_DISABLED=true` for local test mode)
- [x] Spring Security: `/users/register`, `/users/login`, actuator open; `/admin/**` requires `ROLE_ADMIN`; everything else authenticated unless `APP_SECURITY_DISABLED=true`
- [x] Kafka producer (`UserEventPublisher`) -- publishes after DB commit via `TransactionSynchronization.afterCommit`
- [x] Global exception handling (`ApiException` -> `ErrorResponse` envelope)

---

## Package Structure (actual)

```
org.vidrec.userservice
  |-- UserServiceApplication.java
  |-- admin/
  |   |-- AdminUserController.java
  |   |-- AdminUserService.java
  |   |-- AdminBootstrapRunner.java
  |   |-- AdminBanUserRequest.java
  |   |-- AdminUpdateUserRequest.java
  |   |-- AdminDashboardResponse.java
  |   |-- AdminDashboardRecentUserResponse.java
  |   |-- AdminUserListResponse.java
  |   |-- AdminUserDetailResponse.java
  |   `-- AdminUserSummaryResponse.java
  |-- config/
  |   `-- DotenvEnvironmentListener.java
  |-- event/
  |   `-- UserEvent.java
  |-- kafka/
  |   `-- UserEventPublisher.java
  |-- preference/
  |   |-- UserPreference.java
  |   |-- UserPreferenceRepository.java
  |   |-- PreferenceDTO.java
  |   `-- UpdatePreferencesRequest.java
  |-- security/
  |   |-- SecurityConfig.java
  |   |-- HeaderAuthFilter.java
  |   `-- JwtUtil.java
  |-- shared/exception/
  |   |-- ApiException.java
  |   |-- ErrorDetail.java
  |   |-- ErrorResponse.java
  |   `-- GlobalExceptionHandler.java
  `-- user/
      |-- UserController.java
      |-- UserService.java
      |-- UserRepository.java
      |-- User.java
      |-- UserRole.java
      |-- RegisterRequest.java
      |-- LoginRequest.java
      |-- UpdateProfileRequest.java
      |-- AuthResponse.java
      `-- UserProfileResponse.java
```

---

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/users/register` | none | emits `user.events` type=`registered` |
| POST | `/users/login` | none | 401 INVALID_CREDENTIALS, 403 ACCOUNT_BANNED / ACCOUNT_INACTIVE |
| GET | `/users/{id}/profile` | self | 403 if JWT subject != path id |
| PUT | `/users/{id}/profile` | self | partial update; 400 if all fields null |
| PUT | `/users/{id}/preferences` | self | replaces all preferences, emits `prefs_updated` |
| GET | `/admin/users/dashboard` | admin | total / active / banned / admin counts + last 7 days + 5 recent users |
| GET | `/admin/users` | admin | page, size, active?, role? |
| GET | `/admin/users/{id}` | admin | full detail incl. preferences |
| PUT | `/admin/users/{id}` | admin | edit display/bio/picture/role; admin cannot demote self |
| PUT | `/admin/users/{id}/ban` | admin | emits `banned`; admin cannot ban self |
| PUT | `/admin/users/{id}/unban` | admin | emits `reinstated`; rejects if not currently banned |
| DELETE | `/admin/users/{id}` | admin | emits `deleted`; admin cannot delete self; cascades preferences |

---

## Key Business Rules

1. Passwords hashed with BCrypt; plain text never stored or logged.
2. JWT secret from env `JWT_SECRET`; expiration from `JWT_EXPIRATION_MS` (default 86 400 000 = 24h).
3. JWT contains the user's role in a `role` claim so admin routes can be enforced everywhere.
4. Preferences are **replaced** on PUT (`deleteByUserId` then insert).
5. Kafka publishes are AFTER_COMMIT via `TransactionSynchronization` (single topic: `user.events`).
   `eventType` is one of: `registered`, `prefs_updated`, `deactivated`, `banned`, `reinstated`, `deleted`.
6. Banned users (`is_active=false` + `banned_at` set) cannot log in.
7. Admin self-protection: ban / delete / role demotion of own account is rejected with 403.
8. `HeaderAuthFilter` rejects any request not carrying the matching `X-Internal-Token`, so the
   service is unreachable except via the gateway.
   In local test mode (`APP_SECURITY_DISABLED=true`), it instead seeds a synthetic auth context so direct service calls still work.

---

## Kafka

- Bootstrap servers from `KAFKA_BOOTSTRAP_SERVERS`.
- Default security protocol is **SSL** with PKCS12 keystore + JKS truststore (env-overridable).
- Single topic produced: `user.events`. Key = `userId.toString()`, value = JSON.

---

## Files to Read First

1. `user/UserService.java`
2. `admin/AdminUserService.java`
3. `kafka/UserEventPublisher.java`
4. `security/HeaderAuthFilter.java`
5. `security/JwtUtil.java`

---

## Known Issues / TODOs

- No HTTP endpoint exposes `UserService.deactivateUser()`; only admin delete / ban currently emits lifecycle events for non-registration cases.
- No email verification, password reset, or refresh token flow.
- No tests beyond the default context-load test.
- `JwtUtil.generateToken` still uses the deprecated `setSubject` / `signWith(SignatureAlgorithm.HS256)` API.
