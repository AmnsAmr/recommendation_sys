import type { UiVideo } from "@/lib/video-mapper";

export type HistoryItem = {
  videoId: string;
  title: string;
  watchedAt: string;
  progress: number;
  video?: UiVideo;
};

const HISTORY_KEY_PREFIX = "videorec-watch-history-";
const HISTORY_EVENT = "videorec-history-change";
// Mirrors auth.tsx's AUTH_EVENT — when the signed-in user changes we have to
// re-read the snapshot so the History page reflects the new user's key, not
// the previous user's. Kept as a string literal to avoid a circular import.
const AUTH_EVENT = "videorec-auth-change";

function getStoredUserId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("user");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { userId?: string };
    return parsed.userId || null;
  } catch {
    return null;
  }
}

function historyKey(userId: string | null): string | null {
  return userId ? `${HISTORY_KEY_PREFIX}${userId}` : null;
}

export function readHistorySnapshot() {
  if (typeof window === "undefined") {
    return "[]";
  }

  const key = historyKey(getStoredUserId());
  if (!key) {
    // Anonymous viewer (logged out): no history is visible. This also prevents
    // the pre-D global "videorec-watch-history" blob from bleeding through
    // for users who upgraded in place.
    return "[]";
  }

  return window.localStorage.getItem(key) || "[]";
}

export function subscribeToHistory(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(HISTORY_EVENT, onChange);
  window.addEventListener(AUTH_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(HISTORY_EVENT, onChange);
    window.removeEventListener(AUTH_EVENT, onChange);
  };
}

export function parseHistory(value: string | null) {
  try {
    const parsed = JSON.parse(value || "[]") as Partial<HistoryItem>[];
    return parsed.flatMap((item) => {
      const title = item.title || item.video?.title;
      if (!title || typeof item.watchedAt !== "string") {
        return [];
      }

      const progress = typeof item.progress === "number"
        ? Math.min(Math.max(item.progress, 0), 100)
        : 0;

      return [{
        videoId: item.videoId || item.video?.id || title,
        title,
        watchedAt: item.watchedAt,
        progress,
        video: item.video,
      }];
    });
  } catch {
    return [];
  }
}

export function saveHistory(item: HistoryItem) {
  const key = historyKey(getStoredUserId());
  if (!key) {
    // Don't persist watches for anonymous viewers — there's no account to
    // attribute them to, and writing under a shared key was the original bug.
    return;
  }

  const current = parseHistory(window.localStorage.getItem(key) || "[]")
    .filter((entry) => entry.videoId !== item.videoId);
  const next = [item, ...current].slice(0, 30);
  window.localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function clearHistory() {
  const key = historyKey(getStoredUserId());
  if (key) {
    window.localStorage.removeItem(key);
  }
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function hydrateHistory(items: HistoryItem[]) {
  return items.filter((item) => item.video);
}
