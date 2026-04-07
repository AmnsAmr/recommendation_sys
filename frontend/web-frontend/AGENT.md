# AGENT.md — frontend (next-app)
> Read root RULES.md and root AGENT.md before this file.

---

## What This App Does

Next.js 14 frontend. Displays the video catalog, plays videos, shows personalized recommendations,
handles upload, and tracks user interactions (watch %, likes, search clicks) to send to the backend.

---

## Current Implementation State

- [ ] Project scaffold (Next.js 14, TypeScript, Tailwind, React Query)
- [ ] lib/api.ts — all API call functions
- [ ] Homepage — recommendation feed
- [ ] Video player page /watch/[id]
- [ ] Upload page /upload
- [ ] Search page /search
- [ ] Auth pages /login, /register
- [ ] Watch time tracking (heartbeat + on-end)
- [ ] Like/dislike buttons wired to API
- [ ] Search click tracking

---

## Folder Structure

```
next-app/
  ├── app/
  │     ├── page.tsx                    ← homepage: recommendation feed
  │     ├── watch/[id]/page.tsx         ← video player + similar videos
  │     ├── upload/page.tsx             ← upload form (auth required)
  │     ├── search/page.tsx             ← search results
  │     ├── login/page.tsx
  │     └── register/page.tsx
  ├── components/
  │     ├── VideoCard.tsx               ← thumbnail + title + metadata
  │     ├── VideoPlayer.tsx             ← HTML5 player (own) or iframe (YouTube)
  │     ├── RecommendationFeed.tsx      ← grid of VideoCards
  │     ├── SearchBar.tsx
  │     └── UploadForm.tsx
  ├── lib/
  │     ├── api.ts                      ← ALL fetch calls live here
  │     ├── auth.ts                     ← JWT storage (localStorage) + helpers
  │     └── types.ts                    ← all TypeScript types/interfaces
  └── hooks/
        ├── useRecommendations.ts       ← React Query hook
        ├── useVideo.ts
        └── useWatchTracker.ts          ← tracks watch % and posts to API
```

---

## Key Rules for This Service

1. **All API calls go through `lib/api.ts`** — never call fetch/axios directly from a component or page
2. **All server state via React Query** — no `useState` + `useEffect` for data fetching
3. **All API response types defined in `lib/types.ts`** — no `any`
4. **JWT stored in `localStorage`** — key: `auth_token`. Read/write only via `lib/auth.ts` helpers
5. **Watch tracking** — `useWatchTracker` hook handles:
   - Heartbeat every 30 seconds during playback
   - Final event on video end
   - Final event on `beforeunload` (user closes tab)
6. **Search click** — when user clicks a result, POST /videos/search with `{query, clickedVideoId, resultVideoIds[]}`
7. **Video player logic**:
   - `source === "youtube"` → render YouTube iframe
   - `source === "own"` → render HTML5 `<video>` with R2 signed URL

---

## Files to Read First

1. `lib/api.ts` — all API functions
2. `lib/types.ts` — all data types
3. `hooks/useWatchTracker.ts` — watch tracking logic
4. `app/watch/[id]/page.tsx` — most complex page

---

## Known Issues / TODOs

- No pagination on recommendation feed yet
- Upload progress bar not implemented
- No error boundary components yet
