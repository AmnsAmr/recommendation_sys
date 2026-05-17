# AGENT.md -- frontend (web-frontend)
> Read root RULES.md and root AGENT.md before this file.

---

## What This App Does

Next.js 16.2.2 (App Router) + React 19 + TypeScript + Tailwind v4 frontend.

**Today the UI runs entirely on mock data.** Every page renders from `src/lib/mock-data.ts`, auth is
faked in `localStorage`, and there is no `lib/api.ts`. No HTTP call is made to the gateway from any
page in `src/`. The visual shell, navigation, and admin views exist; wiring them to the real backend
is the remaining work.

---

## Current Implementation State

### Implemented (UI shell only)

- [x] Project scaffold (Next.js 16.2.2, React 19, TypeScript, Tailwind v4)
- [x] Page routes:
      - `/` -> redirects to `/login`
      - `/login`, `/register`
      - `/homepage` (category filter + grid of mock videos)
      - `/watch` (mock player + comments + recommendations sidebar)
      - `/upload` (form only, no submit)
      - `/profile`, `/history`
      - Admin: `/admin/dashboard`, `/admin/user-management`, `/admin/video-moderation`
      - Legacy/duplicate top-level admin shells: `/admin-dashboard`, `/user-management`, `/video-moderation`
- [x] Shared components: `app-shell`, `admin-shell`, `brand-mark`, `video-card`, `video-poster`
- [x] Fake auth helper: `lib/auth.tsx` -- `useAuth` (reads `localStorage.user`), `isAdminUser`, `AdminGuard`
- [x] Local watch history: `lib/history.ts` -- `localStorage`-backed with subscribe/emit pattern
- [x] Mock dataset: `lib/mock-data.ts` -- `categories`, `videos`, `comments`

### Not implemented

- [ ] `lib/api.ts` -- API client; required by RULES.md §5
- [ ] `lib/types.ts` -- shared response types
- [ ] `hooks/` directory (no `useRecommendations`, `useVideo`, `useWatchTracker`)
- [ ] Real `POST /users/register` / `POST /users/login` -- login currently fabricates a user from email + a role toggle
- [ ] Real JWT storage / refresh -- only `{email, role, username}` is stored under `localStorage.user`; the gateway expects a real bearer token
- [ ] Real homepage feed (`GET /recommendations/{userId}` or `/videos/catalog`)
- [ ] Real video player using R2 URL (`source=own`) or YouTube iframe (`source=youtube`)
- [ ] Watch tracking heartbeat -- progress is simulated client-side; no `POST /videos/watch` call
- [ ] Like / dislike buttons wired to `POST /videos/{id}/like`
- [ ] Search input + `POST /videos/search/click` tracking
- [ ] Upload flow (`POST /videos/init` + `PUT /videos/{id}/upload` with the `X-Upload-Token`)
- [ ] Admin pages backed by `/admin/users/**` and `/admin/videos/**` data
- [ ] Error boundaries, pagination, loading states tied to real fetches

---

## Folder Structure (actual)

```
web-frontend/
  |-- package.json                # next 16.2.2, react 19.2.4, tailwind v4
  |-- next.config.ts
  |-- tsconfig.json
  |-- public/                     # default Next icons only
  `-- src/
      |-- app/
      |   |-- layout.tsx          # root <html> + globals.css
      |   |-- page.tsx            # redirect("/login")
      |   |-- globals.css
      |   |-- login/page.tsx
      |   |-- register/page.tsx
      |   |-- homepage/page.tsx
      |   |-- watch/page.tsx
      |   |-- upload/page.tsx
      |   |-- profile/page.tsx
      |   |-- history/page.tsx
      |   |-- admin/
      |   |   |-- dashboard/page.tsx
      |   |   |-- user-management/page.tsx
      |   |   `-- video-moderation/page.tsx
      |   |-- admin-dashboard/page.tsx       # legacy shell
      |   |-- user-management/page.tsx       # legacy shell
      |   `-- video-moderation/page.tsx      # legacy shell
      |-- components/
      |   |-- app-shell.tsx
      |   |-- admin-shell.tsx
      |   |-- brand-mark.tsx
      |   |-- video-card.tsx
      |   `-- video-poster.tsx
      `-- lib/
          |-- auth.tsx
          |-- history.ts
          `-- mock-data.ts
```

---

## Folder Structure (target -- when API wiring lands)

```
src/
  |-- app/                        # as above
  |-- components/                 # as above + RecommendationFeed, SearchBar, VideoPlayer, UploadForm
  |-- lib/
  |   |-- api.ts                  # fetch wrapper using NEXT_PUBLIC_API_URL
  |   |-- auth.ts                 # real JWT helpers (replaces lib/auth.tsx fake)
  |   `-- types.ts                # response DTO types mirroring api-contract/
  `-- hooks/
      |-- useRecommendations.ts
      |-- useVideo.ts
      `-- useWatchTracker.ts
```

---

## Key Rules for This App (apply when wiring real APIs)

1. All API calls go through `lib/api.ts` (RULES.md §5 TypeScript rule).
2. Base URL comes from `NEXT_PUBLIC_API_URL` (already wired in `docker-compose.yml` to `http://api-gateway:8080`).
3. JWT stored in `localStorage.auth_token` and sent as `Authorization: Bearer <token>`. Replace the
   current `localStorage.user` shape -- it stores only `{email, role, username}`, not a real token.
4. Watch tracking: heartbeat every 30 s + on-end + `beforeunload`, posting completion percentage to
   `POST /videos/watch`.
5. Search click tracking: `POST /videos/search/click` with `{query, resultVideoIds, clickedVideoId}`.
6. Player logic:
   - `source == "youtube"` -> YouTube iframe using `youtubeId`
   - `source == "own"` -> HTML5 `<video>` with the URL from `VideoResponse.url`
7. Admin pages must call `/admin/users/**` and `/admin/videos/**`; current `AdminGuard` only checks the
   client-side `role` field and offers no real authorization.

---

## Files to Read First

1. `src/lib/mock-data.ts` (until the API client exists, this is the data source)
2. `src/lib/auth.tsx` (fake auth that the new `lib/auth.ts` must replace)
3. `src/components/app-shell.tsx`, `src/components/admin-shell.tsx` (layout entry points)
4. `src/app/homepage/page.tsx` (first place to swap mock -> API)
5. `src/app/watch/page.tsx` (most complex page; needs player + tracking + like/dislike wiring)

---

## Known Issues / TODOs

- Zero API integration -- the backend exists but the UI never calls it. This is the single biggest gap before the project is end-to-end functional.
- Duplicate admin shells at both `/admin/...` and top-level `/admin-dashboard`, `/user-management`, `/video-moderation`; one set should be removed once the real flow is decided.
- `lib/auth.tsx` accepts any email/password and a free-text role toggle -- replace before exposing.
- No pagination, loading skeletons, error states, or toast/notification system on data-driven pages.
- No tests.
