# MVP Plan -- SVD Sidecar (FastAPI)

Goal: Expose training and prediction endpoints for the recommendation service.

Endpoints:
1. GET /health
2. POST /train
3. POST /predict

Request/response:
- POST /predict
  Request: { "userId": "uuid", "videoId": "vid_123" }
  Response: { "userId": "uuid", "videoId": "vid_123", "score": 0.0 }

Phases:
1. Phase 1 (MVP): stubbed responses
2. Phase 2: implement Surprise SVD training
3. Phase 3: scheduled retrain (cron or manual)

Training pipeline (Phase 2):
1. Read interactions from recommendation_schema
2. Train SVD with rating_scale [-1, 1]
3. Write vectors to user_factors and item_factors

Env vars:
- SUPABASE_DB_URL_REC (or split host/db)
- SUPABASE_DB_USERNAME
- SUPABASE_DB_PASSWORD

MVP shortcuts:
- No async queue
- No model persistence needed initially

References:
- `backend/svd-sidecar/app/main.py`
