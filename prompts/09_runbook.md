# MVP Plan -- Runbook

Goal: Step-by-step local demo.

1. Start services
- docker compose up --build

2. Register a user
- POST /users/register

3. Seed videos
- Either YouTube sync or manual inserts into videos table

4. Fetch catalog
- GET /videos/catalog

5. Watch a video
- POST /videos/watch

6. Fetch recommendations
- GET /recommendations/{userId}

Sample curl (adjust token/userId):
```
curl -X POST http://localhost:8080/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"Pass1234","username":"alice","displayName":"Alice","interests":["technology"]}'
```

```
curl -X GET http://localhost:8080/videos/catalog
```

```
curl -X POST http://localhost:8080/videos/watch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"videoId":"vid_123","watchDuration":120,"videoDuration":300,"completionPct":0.4,"source":"own"}'
```

```
curl -X GET http://localhost:8080/recommendations/<userId> \
  -H "Authorization: Bearer <token>"
```

Expected outcomes:
1. user.registered -> user_category_profiles rows
2. video.uploaded -> item_factors rows
3. video.watched -> interactions row
4. rec cache invalidated then repopulated

References:
- `api-contract/04_shared_standards_and_kafka_contracts_v2.md`
