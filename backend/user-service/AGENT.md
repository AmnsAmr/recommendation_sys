# AGENT.md — user-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Handles user registration, login, JWT generation, profile management, and category preferences.
It is the simplest service but the most security-sensitive — get auth right first.

---

## Current Implementation State

- [ ] Project scaffold
- [ ] User entity + repository
- [ ] POST /users/register
- [ ] POST /users/login + JWT generation
- [ ] GET /users/{id}/profile
- [ ] PUT /users/{id}/preferences
- [ ] JWT utility class
- [ ] Spring Security config (permit register/login, require JWT on rest)

---

## Package Structure

```
com.platform.user
  ├── user/
  │     ├── UserController.java
  │     ├── UserService.java
  │     ├── UserRepository.java
  │     ├── User.java                      entity
  │     ├── RegisterRequest.java           DTO
  │     ├── LoginRequest.java              DTO
  │     ├── AuthResponse.java              DTO: token, userId, username
  │     └── UserProfileResponse.java       DTO
  ├── preference/
  │     ├── UserPreference.java            entity
  │     ├── UserPreferenceRepository.java
  │     └── PreferenceRequest.java         DTO: category, weight
  ├── security/
  │     ├── JwtUtil.java                   generate + validate + extract userId
  │     ├── JwtFilter.java                 OncePerRequestFilter
  │     └── SecurityConfig.java
  └── config/
        └── PasswordConfig.java            BCryptPasswordEncoder bean
```

---

## Key Business Rules

1. **Passwords hashed with BCrypt** — never store plain text, never log passwords
2. **JWT payload contains only `userId` (UUID)** — no email, no roles in token
3. **JWT secret from env var `JWT_SECRET`** — never hardcode
4. **This service does NOT validate JWT** — that happens at the API Gateway
   - This service generates JWT on login
   - Gateway validates JWT on every subsequent request
   - Gateway forwards `X-User-Id` header — services trust this header
5. **Preferences are replaced on PUT** — delete all existing prefs for userId, insert new ones
6. **Email must be unique** — return 409 Conflict if duplicate

---

## Files to Read First

1. `security/JwtUtil.java` — token generation and validation
2. `user/UserService.java` — registration and login logic
3. `security/SecurityConfig.java` — which endpoints are public vs protected

---

## Known Issues / TODOs

- No email verification
- No password reset flow
- No refresh token — JWT expires after 24h, user must re-login
