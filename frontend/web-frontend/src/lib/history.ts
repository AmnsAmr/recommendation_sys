import { videos } from "@/lib/mock-data";

export type HistoryItem = {
  title: string;
  watchedAt: string;
  progress: number;
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
    return JSON.parse(value || "[]") as HistoryItem[];
  } catch {
    return [];
  }
}

export function saveHistory(item: HistoryItem) {
  const current = parseHistory(readHistorySnapshot()).filter((entry) => entry.title !== item.title);
  const next = [item, ...current].slice(0, 30);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function clearHistory() {
  window.localStorage.removeItem(HISTORY_KEY);
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function hydrateHistory(items: HistoryItem[]) {
  return items
    .map((item) => ({
      ...item,
      video: videos.find((video) => video.title === item.title),
    }))
    .filter((item) => item.video);
}
