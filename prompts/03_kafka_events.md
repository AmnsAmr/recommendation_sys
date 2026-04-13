# MVP Plan -- Kafka Events

Goal: Validate the event pipeline end-to-end.

Required topics:
- video.watched
- video.liked
- user.searched
- video.uploaded
- user.registered

Producer responsibilities:
1. Generate eventId (UUID) at publish time.
2. Set timestamp (ISO-8601).
3. Publish after DB commit.

Consumer responsibilities (recommendation-service):
1. Check processed_events by eventId before processing.
2. Insert processed_events after success.
3. Log full payload on error.

Example payloads:

video.watched:
```json
{
  "eventId": "uuid",
  "userId": "uuid",
  "videoId": "vid_123",
  "watchDuration": 120,
  "videoDuration": 300,
  "completionPct": 0.4,
  "source": "own",
  "timestamp": "2026-04-13T12:00:00Z"
}
```

video.liked:
```json
{
  "eventId": "uuid",
  "userId": "uuid",
  "videoId": "vid_123",
  "action": "like",
  "source": "own",
  "timestamp": "2026-04-13T12:01:00Z"
}
```

user.searched:
```json
{
  "eventId": "uuid",
  "userId": "uuid",
  "query": "kafka tutorial",
  "resultVideoIds": ["vid_1", "vid_2"],
  "clickedVideoId": "vid_2",
  "timestamp": "2026-04-13T12:02:00Z"
}
```

video.uploaded:
```json
{
  "eventId": "uuid",
  "videoId": "vid_123",
  "title": "Intro to Kafka",
  "description": "...",
  "tags": ["kafka", "backend"],
  "categoryId": "technology",
  "thumbnailUrl": "https://...",
  "language": "en",
  "source": "own",
  "timestamp": "2026-04-13T12:03:00Z"
}
```

user.registered:
```json
{
  "eventId": "uuid",
  "userId": "uuid",
  "username": "alice",
  "interests": ["technology"],
  "timestamp": "2026-04-13T12:04:00Z"
}
```

MVP shortcuts:
- DLQ topics can be added later.
- No retry backoff required initially.

References:
- `api-contract/04_shared_standards_and_kafka_contracts_v2.md`
- `uml/08_kafka_event_flow.puml`
