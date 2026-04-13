# MVP Plan -- Video Service

Goal: Provide a catalog from uploads and YouTube, publish events.

Endpoints:
1. POST /videos/init
2. PUT /videos/{id}/upload
3. GET /videos/{id}
4. GET /videos/catalog
5. GET /videos/search
6. POST /videos/watch
7. POST /videos/{id}/like
8. POST /videos/search/click

Implementation steps:
1. Video entity + repository
2. Upload init:
   - create PENDING video
   - return upload token
3. Upload file:
   - store in R2
   - update video status READY + thumbnailUrl
   - write outbox event for video.uploaded
4. Catalog:
   - filter by categoryId, source, language
5. Watch:
   - insert watch_session
   - atomic update view_count
   - outbox event for video.watched
6. Like:
   - atomic update like/dislike count
   - outbox event for video.liked
7. Search click:
   - publish user.searched

MVP shortcuts:
- If R2 not configured, use YouTube-only catalog
- If YouTube API not configured, seed videos manually

References:
- `api-contract/02_video_service_contracts_v2.md`
- `uml/03_video_service_classes_v2.puml`
- `uml/05_sequence_upload.puml`
