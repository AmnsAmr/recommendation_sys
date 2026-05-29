"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/app-shell";
import { VideoCard } from "@/components/video-card";
import { api } from "@/lib/api";
import { clearHistory, parseHistory, readHistorySnapshot, subscribeToHistory } from "@/lib/history";
import { fromApiVideo, type UiVideo } from "@/lib/video-mapper";

export default function HistoryPage() {
  const rawHistory = useSyncExternalStore(subscribeToHistory, readHistorySnapshot, () => "[]");
  const items = parseHistory(rawHistory);
  const [remoteVideos, setRemoteVideos] = useState<Record<string, UiVideo>>({});

  useEffect(() => {
    let active = true;
    const missingIds = items
      .filter((item) => !item.video && item.videoId && !remoteVideos[item.videoId])
      .map((item) => item.videoId);

    if (!missingIds.length) {
      return;
    }

    Promise.all(
      Array.from(new Set(missingIds)).map((id) =>
        api.getVideo(id).then((video) => [id, fromApiVideo(video)] as const).catch(() => null),
      ),
    ).then((results) => {
      if (!active) {
        return;
      }

      setRemoteVideos((current) => {
        const next = { ...current };
        results.forEach((result) => {
          if (result) {
            next[result[0]] = result[1];
          }
        });
        return next;
      });
    });

    return () => {
      active = false;
    };
  }, [items, remoteVideos]);

  const visibleItems = items.flatMap((item) => {
    const video = item.video || remoteVideos[item.videoId];
    return video ? [{ ...item, video }] : [];
  });

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
      {visibleItems.length === 0 ? (
        <section className="grid min-h-[360px] place-items-center rounded-2xl bg-white p-8 text-center shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-slate-950">No watched videos yet</h2>
            <p className="mt-2 text-sm text-slate-500">Open a video and press Play. It will appear here.</p>
          </div>
        </section>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2">
          {visibleItems.map((item) => (
            <div key={item.videoId}>
              <VideoCard video={item.video} />
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
