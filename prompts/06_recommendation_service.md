# MVP Plan -- Recommendation Service

Goal: Serve recommendations and update profiles from Kafka events.

Consumers:
1. video.watched
2. video.liked
3. user.searched
4. video.uploaded
5. user.registered

Processing rules:
1. Dedup by processed_events.
2. video.watched:
   - insert interaction
   - update item_factors.view_count
   - invalidate cache
3. video.liked:
   - insert interaction
   - invalidate cache
4. user.searched:
   - insert interaction if clicked
5. video.uploaded:
   - upsert item_factors (tags, category, thumbnailUrl, language)
6. user.registered:
   - insert user_category_profiles (weight=1.0, source=declared)

Recommendation flow:
1. If interactions < 5 -> cold start by user_category_profiles.
2. Else -> hybrid: content + SVD score.
3. Cache result in Redis (TTL 10 min).

Content-based scoring (MVP):
- build a simple vector from tags/category/language
- compute cosine similarity

MVP shortcuts:
- SVD score can be 0.0 until sidecar training is built.
- Similar videos can be based on tag/category overlap.

References:
- `api-contract/03_recommendation_service_contracts.md`
- `uml/04_recommendation_service_classes_v2.puml`
- `uml/06_sequence_watch_recommendation.puml`
