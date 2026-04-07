# Phase 5 - Interaction Pipeline (Week 4-5, Member 2 + Member 4)

**Goal**
User actions flow through Kafka into the interactions table.

**Build Order**
1. `POST /videos/watch` saves WatchSession and publishes `video.watched`.
2. Recommendation-service consumes `video.watched`, inserts Interaction, invalidates cache.
3. `POST /videos/{id}/like` updates counters and publishes `video.liked`.
4. Recommendation-service consumes `video.liked`, inserts Interaction.
5. Frontend tracks watch completion and calls the watch endpoint.

**Done When**
- Interaction rows appear in the recommendation schema.
- Cache invalidates when new interactions arrive.
