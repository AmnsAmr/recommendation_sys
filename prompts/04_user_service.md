# MVP Plan -- User Service

Goal: Registration, login, profile, and preferences with Kafka events.

Endpoints:
1. POST /users/register
2. POST /users/login
3. GET /users/{userId}/profile
4. PUT /users/{userId}/preferences
5. PUT /users/{userId}/profile

Implementation steps:
1. User entity + repository
2. Preference entity + repository
3. Register flow:
   - validate email, password, username
   - hash password
   - create user
   - insert preferences from interests
   - emit user.registered after commit
4. Login flow:
   - verify password
   - issue JWT
5. Update preferences:
   - replace all preferences
   - emit user.prefs.updated after commit

Validation rules:
- email format, unique
- password min 8
- username regex
- interests 1-10 items

MVP shortcuts:
- no email verification
- no refresh token

References:
- `api-contract/01_user_service_contracts_v2.md`
- `uml/02_user_service_classes_v2.puml`
