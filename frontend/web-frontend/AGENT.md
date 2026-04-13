# AGENT.md -- frontend (web-frontend)
> Read root RULES.md and root AGENT.md before this file.

---

## What This App Does

Next.js frontend. Displays the video catalog, plays videos, shows personalized recommendations,
handles upload, and tracks user interactions (watch %, likes, search clicks) to send to the backend.

---

## Current Implementation State

- [ ] Project scaffold (Next.js, TypeScript)
- [ ] lib/api.ts -- API call functions
- [ ] Homepage -- recommendation feed
- [ ] Video player page /watch/[id]
- [ ] Upload page /upload
- [ ] Search page /search
- [ ] Auth pages /login, /register
- [ ] Watch time tracking
- [ ] Like/dislike buttons wired to API
- [ ] Search click tracking

---

## Folder Structure (target)

```
web-frontend/
  |-- app/
  |   |-- page.tsx
  |   |-- watch/[id]/page.tsx
  |   |-- upload/page.tsx
  |   |-- search/page.tsx
  |   |-- login/page.tsx
  |   `-- register/page.tsx
  |-- components/
  |   |-- VideoCard.tsx
  |   |-- VideoPlayer.tsx
  |   |-- RecommendationFeed.tsx
  |   |-- SearchBar.tsx
  |   `-- UploadForm.tsx
  |-- lib/
  |   |-- api.ts
  |   |-- auth.ts
  |   `-- types.ts
  `-- hooks/
      |-- useRecommendations.ts
      |-- useVideo.ts
      `-- useWatchTracker.ts
```

---

## Key Rules for This App

1. All API calls go through lib/api.ts.
2. All server state via React Query if used.
3. All API response types in lib/types.ts.
4. JWT stored in localStorage key auth_token (use helpers).
5. Watch tracking: heartbeat every 30s, on-end event, beforeunload.
6. Search click: POST /videos/search/click with query, clickedVideoId, resultVideoIds.
7. Player logic:
   - source == youtube -> YouTube iframe
   - source == own -> HTML5 video with signed URL

---

## Files to Read First

1. lib/api.ts
2. lib/types.ts
3. hooks/useWatchTracker.ts
4. app/watch/[id]/page.tsx

---

## Known Issues / TODOs

- No pagination on recommendation feed
- Upload progress bar not implemented
- No error boundary components yet