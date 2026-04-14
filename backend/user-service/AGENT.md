# AGENT.md -- user-service
> Read root RULES.md and root AGENT.md before this file.

---

## What This Service Does

Handles user registration, login, JWT generation, profile management, and category preferences.
Emits user lifecycle events to Kafka for cold-start recommendations.

---

## Current Implementation State

- [ ] Project scaffold
- [ ] User entity + repository
- [ ] POST /users/register (emits user.events type=registered)
- [ ] POST /users/login + JWT generation
- [ ] GET /users/{id}/profile
- [ ] PUT /users/{id}/preferences (emits user.events type=prefs_updated)
- [ ] PUT /users/{id}/profile
- [ ] Deactivate user (emits user.events type=deactivated)
- [ ] Password hashing + JWT utility

---

## Package Structure (target)

```
org.vidrec.userservice
  |-- user/
  |   |-- UserController.java
  |   |-- UserService.java
  |   |-- UserRepository.java
  |   |-- User.java
  |   |-- RegisterRequest.java
  |   |-- LoginRequest.java
  |   |-- AuthResponse.java
  |   `-- UserProfileResponse.java
  |-- preference/
  |   |-- UserPreference.java
  |   |-- UserPreferenceRepository.java
  |   `-- PreferenceDTO.java
  |-- event/
  |   `-- UserEvent.java
  |-- kafka/
  |   `-- UserEventPublisher.java
  `-- security/
      |-- JwtUtil.java
      `-- SecurityConfig.java
```

---

## Key Business Rules

1. Passwords hashed with BCrypt (never store plain text).
2. JWT secret from env var JWT_SECRET.
3. This service does not validate JWT on incoming requests (gateway does).
4. Preferences are replaced on PUT (delete existing, insert new).
5. Emits events after commit:
   - user.events (eventType = registered, prefs_updated, deactivated)

---

## Files to Read First

1. `security/JwtUtil.java`
2. `user/UserService.java`
3. `kafka/UserEventPublisher.java`

---

## Known Issues / TODOs

- No email verification
- No password reset flow
- No refresh token
