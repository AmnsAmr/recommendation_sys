# Phase 3 - Video Catalog Slice (Week 2-3, Member 2 leads)

**Goal**
Videos exist in the system and the recommendation-service knows about them.

**Build Order**
1. YouTube API sync on startup pulls about 100 videos into the video DB.
2. `video.uploaded` Kafka event fires for each synced video.
3. Recommendation-service consumes `video.uploaded` and creates `item_factors` rows.
4. `GET /videos/catalog` returns the list.
5. `GET /videos/{id}` returns one video.

**Done When**
- The catalog endpoint returns real videos from YouTube.
- The recommendation-service has `item_factors` for synced videos.
