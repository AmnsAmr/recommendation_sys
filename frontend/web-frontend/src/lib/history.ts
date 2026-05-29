import { videos } from "@/lib/mock-data";
import type { UiVideo } from "@/lib/video-mapper";

export type HistoryItem = {
  videoId: string;
  title: string;
  watchedAt: string;
  progress: number;
  video?: UiVideo;
};

const HISTORY_KEY = "videorec-watch-history";
const HISTORY_EVENT = "videorec-history-change";

export function readHistorySnapshot() {
  if (typeof window === "undefined") {
    return "[]";
  }

  return window.localStorage.getItem(HISTORY_KEY) || "[]";
}

export function subscribeToHistory(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(HISTORY_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(HISTORY_EVENT, onChange);
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
  const current = parseHistory(readHistorySnapshot())
    .filter((entry) => entry.videoId !== item.videoId);
  const next = [item, ...current].slice(0, 30);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function clearHistory() {
  window.localStorage.removeItem(HISTORY_KEY);
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function hydrateHistory(items: HistoryItem[]) {
  return items.flatMap((item) => {
    if (item.video) {
      return [item];
    }

    const video = videos.find((candidate) => candidate.title === item.title);
    if (!video) {
      return [];
    }

    const hydratedVideo: UiVideo = {
      ...video,
      id: video.title,
      durationSeconds: 0,
      source: "own",
    };

    return [{ ...item, videoId: item.videoId || video.title, video: hydratedVideo }];
  });
}
