"use client";

import { useSyncExternalStore } from "react";
import { AppShell } from "@/components/app-shell";
import { VideoCard } from "@/components/video-card";
import { clearHistory, hydrateHistory, parseHistory, readHistorySnapshot, subscribeToHistory } from "@/lib/history";

export default function HistoryPage() {
  const rawHistory = useSyncExternalStore(subscribeToHistory, readHistorySnapshot, () => "[]");
  const items = parseHistory(rawHistory);
  const hydrated = hydrateHistory(items);

  const clear = () => {
    clearHistory();
  };

  return (
    <AppShell
      title="Watch history"
      eyebrow="Library"
      actions={
        <button
          onClick={clear}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
        >
          Clear history
        </button>
      }
    >
      {hydrated.length === 0 ? (
        <section className="grid min-h-[360px] place-items-center rounded-2xl bg-white p-8 text-center shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-slate-950">No watched videos yet</h2>
            <p className="mt-2 text-sm text-slate-500">Open a video and press Play. It will appear here.</p>
          </div>
        </section>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2">
          {hydrated.map((item) => (
            <div key={item.title}>
              <VideoCard video={item.video!} />
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Watched {new Date(item.watchedAt).toLocaleString()} - {Math.round(item.progress)}% completed
              </p>
            </div>
          ))}
        </section>
      )}
    </AppShell>
  );
}
