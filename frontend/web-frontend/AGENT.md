# AGENT.md -- frontend (web-frontend)
> Read root RULES.md and root AGENT.md before this file.

---

## What This App Does

Next.js 16.2.2 (App Router) + React 19 + TypeScript + Tailwind v4 frontend.

The API client (`lib/api.ts`) is wired to the gateway and login / register / catalog / search / video
detail / watch record / like / upload-init / upload-file / admin users / admin videos all call real
endpoints. JWT is stored under `localStorage.auth_token` and sent as `Authorization: Bearer`. Auth
state (`localStorage.user`) is still client-managed and is what `useAuth` and `AdminGuard` consume.

The remaining gaps are tracker-style integrations (watch heartbeat, search-click tracking, like-button
wiring on the watch page) and the recommendations feed (the back-end `/recommendations/{userId}`
endpoint is itself not implemented yet).

---

## Current Implementation State

### Implemented

- [x] Project scaffold (Next.js 16.2.2, React 19, TypeScript, Tailwind v4)
- [x] Page routes:
      - `/` -> redirects to `/login`
      - `/login`, `/register` -- call real `POST /users/login` / `/users/register`, store JWT under `localStorage.auth_token`, user payload under `localStorage.user`
      - `/homepage` (category filter + catalog grid backed by `GET /videos/catalog`)
      - `/watch` (player + comments + recommendations sidebar -- player/source resolution wired, tracking and like buttons still simulated)
      - `/upload` (calls `POST /videos/init` + `PUT /videos/{id}/upload` with `X-Upload-Token`)
      - `/profile`, `/history`
      - Admin: `/admin/dashboard`, `/admin/user-management`, `/admin/video-moderation` (real admin user / admin video dashboard + pending queue + approve/reject/ban/unban/delete)
      - Legacy/duplicate top-level admin shells: `/admin-dashboard`, `/user-management`, `/video-moderation` (kept for now; pick one set and delete the other)
- [x] `lib/api.ts` -- typed fetch wrapper around `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`); attaches `Authorization: Bearer <auth_token>` unless `auth: false`; parses the `{ error: { code, message } }` envelope on non-2xx
- [x] `lib/types.ts` -- shared `AuthResponse`, `ApiVideo`, `VideoListResponse`, `VideoUploadInitResponse`, `AdminDashboardResponse`, `AdminUserListResponse`, `AdminVideoDashboardResponse`, `AdminVideoListResponse`, `AuthUser`
- [x] `lib/video-mapper.ts` -- maps backend `ApiVideo` to UI props
- [x] `lib/auth.tsx` -- `useAuth` (via `useSyncExternalStore` on `localStorage.user`), `isAdminUser`, `AdminGuard`; `logout()` clears both `auth_token` and `user`
- [x] `lib/history.ts` -- `localStorage`-backed watch history with subscribe/emit
- [x] `lib/mock-data.ts` -- still present as a fallback dataset for parts of the watch page (comments, recommendation sidebar)
- [x] Shared components: `app-shell`, `admin-shell`, `brand-mark`, `video-card`, `video-poster`

### Not implemented

- [ ] `hooks/` directory (`useRecommendations`, `useVideo`, `useWatchTracker`) -- API calls live inline in page components today
- [ ] Watch tracking heartbeat -- the watch page does not yet `POST /videos/watch` on heartbeat / end / `beforeunload`
- [ ] Like / dislike wired to `POST /videos/{id}/like` (the API method exists in `lib/api.ts` but is not called from `watch/page.tsx`)
- [ ] Search-click tracking -- no `POST /videos/search/click` call
- [ ] Recommendation feed -- the back-end `GET /recommendations/{userId}` is not implemented; the homepage uses `/videos/catalog` as a placeholder, and the watch-page sidebar is still mock
- [ ] Error boundaries, pagination, loading skeletons, toast/notification system
- [ ] Tests
- [ ] Decide between `/admin/*` and the legacy top-level admin shells and delete the loser

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
          |-- api.ts
          |-- auth.tsx
          |-- history.ts
          |-- mock-data.ts
          |-- types.ts
          `-- video-mapper.ts
```

---

## Folder Structure (target -- next steps)

Add a `hooks/` directory so per-page API logic stops growing inline:

```
src/
  `-- hooks/
      |-- useRecommendations.ts   # GET /recommendations/{userId} (once the backend lands)
      |-- useVideo.ts             # GET /videos/{id} + source resolution
      `-- useWatchTracker.ts      # heartbeat + on-end + beforeunload -> POST /videos/watch
```

---

## Key Rules for This App

1. All API calls go through `lib/api.ts` (RULES.md §5 TypeScript rule). Do not call `fetch` directly from components.
2. Base URL comes from `NEXT_PUBLIC_API_URL` (already wired in `docker-compose.yml` to `http://api-gateway:8080`; defaults to `http://localhost:8080`).
3. JWT lives in `localStorage.auth_token`. `localStorage.user` is a UI convenience cache, not the source of truth.
4. Watch tracking (not wired yet): heartbeat every 30 s + on-end + `beforeunload`, calling `api.recordWatch(...)`.
5. Search-click tracking (not wired yet): call `POST /videos/search/click` with `{query, resultVideoIds, clickedVideoId}` when a search result is opened.
6. Player logic:
   - `source == "youtube"` -> YouTube iframe using `youtubeId`
   - `source == "own"` -> HTML5 `<video>` with the URL from `ApiVideo.url`
7. `AdminGuard` is a client-side UX gate only -- the real authorization is the gateway / downstream `ROLE_ADMIN` check. Treat the local `user.role` as advisory, not authoritative.

---

## Files to Read First

1. `src/lib/api.ts` (every API call goes through here)
2. `src/lib/types.ts` (the response DTO shapes the rest of the app depends on)
3. `src/lib/auth.tsx` (auth state + `AdminGuard`)
4. `src/components/app-shell.tsx`, `src/components/admin-shell.tsx` (layout entry points)
5. `src/app/homepage/page.tsx` (catalog wiring)
6. `src/app/watch/page.tsx` (most complex page; still needs heartbeat + like/dislike + search-click wiring)

---

## Known Issues / TODOs

- Watch heartbeat, like/dislike, and search-click tracking are still simulated -- `lib/api.ts` already has the methods (`recordWatch`, `likeVideo`); they just aren't called from `watch/page.tsx`.
- Recommendation feed is blocked on the back-end -- `GET /recommendations/{userId}` is not implemented yet, so the homepage feed falls back to `/videos/catalog` and the watch-page sidebar is still on mock data.
- Duplicate admin shells live at both `/admin/...` and top-level `/admin-dashboard`, `/user-management`, `/video-moderation`; decide which set is canonical and delete the other.
- No pagination, loading skeletons, error states, or toast/notification system on data-driven pages.
- No `hooks/` layer -- per-page API code is still inline.
- No tests.
