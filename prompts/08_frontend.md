# MVP Plan -- Frontend

Goal: Minimal UI to prove the recommendation loop.

Pages:
1. /register (email, password, username, displayName, interests)
2. /login
3. / (home feed)
4. /watch/{id}
5. /search
6. /upload (optional)

Core flow:
1. Register user
2. Redirect to home, load cold-start recs
3. Click a video, open watch page
4. Watch sends /videos/watch
5. Return to home, recs update

API calls required:
1. POST /users/register
2. POST /users/login
3. GET /recommendations/{userId}
4. GET /videos/catalog
5. GET /videos/{id}
6. POST /videos/watch
7. POST /videos/{id}/like
8. POST /videos/search/click

MVP shortcuts:
- Basic layout
- No pagination
- Minimal error handling

References:
- `api-contract/01_user_service_contracts_v2.md`
- `api-contract/02_video_service_contracts_v2.md`
- `api-contract/03_recommendation_service_contracts.md`
