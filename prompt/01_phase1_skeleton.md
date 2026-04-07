# Phase 1 - Skeleton (Week 1, all 4 members)

**Goal**
One real HTTP request goes from browser -> gateway -> service -> Kafka -> another service, and you can see it in logs.

**If you think Phase 1 is mostly done**
Use this file as a checklist and verify each item before moving on.

**Step 1: Infrastructure Up (Day 1-2)**
1. Make sure `.env` is filled with Supabase, Aiven Kafka, and Redis settings.
2. Start the stack.

```bash
docker compose up -d
```

3. Confirm Redis is running and each developer can connect to Supabase and Aiven Kafka.

**Step 2: Services Boot (Day 3-4)**
1. Verify all Spring Boot services start inside Docker.
2. Each service must return `UP` from `/actuator/health`.
3. Each service must connect to its own database schema and to Kafka.

**Step 3: Dummy Event Flow (Day 5)**
1. In `video-service`, publish a hardcoded `video.uploaded` event.
2. In `recommendation-service`, consume the event and log it.
3. Watch both logs and confirm the event traveled end-to-end.

**Done When**
- The event is visible in both services' logs.
- `/actuator/health` returns `UP` for all services.

**Tag**
Create the git tag after you finish Phase 1.

```bash
git tag v0.1-skeleton
```
