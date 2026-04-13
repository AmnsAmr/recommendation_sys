# MVP Plan -- Overview

This MVP proves the end-to-end recommendation loop with the smallest viable scope.

Core loop:
1. User registers and declares interests.
2. Videos exist (uploads and/or YouTube sync).
3. User watches a video, event flows to recommendation-service.
4. Recommendations change after the interaction.

Success criteria:
1. Register a user and receive a cold-start feed.
2. Watching a video changes the next recommendation response.
3. Catalog returns mixed sources (own + YouTube) or at least seeded videos.
4. All services start with docker-compose.

Out of scope for MVP:
- Advanced UI polish
- Full SVD training accuracy
- DLQ processing
- Rate limiting, auth refresh tokens

Milestones:
1. Environment running (docker-compose + DB + Kafka)
2. Kafka flow validated (publish + consume)
3. Cold-start recommendations working
4. Watch/like events alter recs
5. Optional: sidecar training

Files to follow:
1. 01_environment.md
2. 02_data_model.md
3. 03_kafka_events.md
4. 04_user_service.md
5. 05_video_service.md
6. 06_recommendation_service.md
7. 07_sidecar.md
8. 08_frontend.md
9. 09_runbook.md

References for context:
- `uml/` (architecture, flows, ERD)
- `api-contract/` (HTTP + Kafka contracts)
