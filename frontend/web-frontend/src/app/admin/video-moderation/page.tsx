"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { VideoPoster } from "@/components/video-poster";
import { YouTubePlayer } from "@/components/youtube-player";
import { api } from "@/lib/api";
import type { AdminVideo } from "@/lib/types";
import { formatVideoCategoryLabel } from "@/lib/video-categories";

type QueueVideo = {
  videoId: string;
  title: string;
  creator: string;
  uploadedAt: string;
  duration: string;
  durationSeconds: number;
  views: string;
  category: string;
  description: string;
  status: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  youtubeId?: string;
  source?: string;
  notes: string;
};

function formatDuration(seconds = 0) {
  if (!seconds || seconds < 0) {
    return "";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatCount(value = 0) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return String(value);
}

function fromApiVideo(video: AdminVideo): QueueVideo {
  const status = video.status?.toUpperCase();
  const durationSeconds = video.duration ?? 0;
  return {
    videoId: video.videoId,
    title: video.title,
    creator: video.uploaderId ? `Creator ${video.uploaderId.slice(0, 8)}` : "Unknown creator",
    uploadedAt: video.createdAt ? new Date(video.createdAt).toLocaleDateString() : "Recently",
    duration: formatDuration(durationSeconds),
    durationSeconds,
    views: `${formatCount(video.viewCount ?? 0)} views`,
    category: video.categoryId ? formatVideoCategoryLabel(video.categoryId) : "Uncategorized",
    description: video.description?.trim() || "No description provided.",
    status: status === "READY" ? "Approved" : status === "REJECTED" ? "Rejected" : "Under review",
    thumbnailUrl: video.thumbnailUrl,
    videoUrl: video.videoUrl,
    youtubeId: video.youtubeId,
    source: video.source,
    notes: "",
  };
}

export default function VideoModerationPage() {
  const [queue, setQueue] = useState<QueueVideo[]>([]);
  const [filter, setFilter] = useState("All videos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPendingVideos()
      .then((response) => {
        const mapped = response.videos.map(fromApiVideo);
        setQueue(mapped);
        setSelectedId(mapped[0]?.videoId ?? null);
      })
      .catch(() => setNotice("Admin video API unavailable."))
      .finally(() => setLoading(false));
  }, []);

  const visibleQueue = useMemo(
    () => queue.filter((video) => filter === "All videos" || video.status === filter),
    [filter, queue],
  );

  const selectedVideo = queue.find((video) => video.videoId === selectedId) || queue[0];

  const updateVideo = (videoId: string, changes: Partial<QueueVideo>, message: string) => {
    const current = queue.find((video) => video.videoId === videoId);
    if (current?.videoId && changes.status) {
      const request =
        changes.status === "Approved"
          ? api.approveVideo(current.videoId, current.notes)
          : changes.status === "Rejected"
            ? api.rejectVideo(current.videoId, current.notes)
            : Promise.resolve();
      request.catch(() => setNotice("Backend moderation failed. Change applied only in the UI."));
    }

    setQueue((current) => current.map((video) => (video.videoId === videoId ? { ...video, ...changes } : video)));
    setSelectedId(videoId);
    setNotice(message);
  };

  const updateSelectedNotes = (notes: string) => {
    if (!selectedVideo) {
      return;
    }
    setQueue((current) =>
      current.map((video) => (video.videoId === selectedVideo.videoId ? { ...video, notes } : video)),
    );
  };

  return (
    <AdminShell title="Video moderation">
      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Review queue</h2>
              <p className="mt-1 text-sm text-slate-500">Approve, reject, or request changes before publishing.</p>
            </div>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="field h-10 max-w-48 px-3 text-sm">
              <option>All videos</option>
              <option>Under review</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>

          {notice ? (
            <div className="reaction-burst mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800">
              {notice}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3">
            {loading ? (
              <div className="rounded-lg bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                Loading review queue...
              </div>
            ) : null}
            {visibleQueue.map((video) => (
              <article
                key={video.videoId}
                className={`grid gap-4 rounded-lg border p-3 sm:grid-cols-[180px_1fr] ${
                  selectedVideo?.videoId === video.videoId ? "border-teal-300 bg-teal-50/50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="relative">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt="" className="aspect-video w-full rounded-md object-cover" />
                  ) : (
                    <VideoPoster kind="video" duration={video.duration} className="aspect-video rounded-md" />
                  )}
                  {video.duration ? (
                    <span className="absolute bottom-1 right-1 rounded-md bg-slate-950/85 px-2 py-0.5 text-xs font-bold text-white">{video.duration}</span>
                  ) : null}
                  <span className="absolute left-1 top-1 rounded-md bg-white/90 px-2 py-0.5 text-xs font-bold text-slate-900">{video.category}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">{video.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {video.creator} · {video.uploadedAt} · {video.views}
                      </p>
                    </div>
                    <span className="w-fit rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-700">{video.status}</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{video.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => updateVideo(video.videoId, { status: "Approved" }, `${video.title} approved.`)}
                      className="pressable rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateVideo(video.videoId, { status: "Rejected" }, `${video.title} rejected.`)}
                      className="pressable rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-700"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setSelectedId(video.videoId);
                        setNotice(`Opened preview for ${video.title}.`);
                      }}
                      className="pressable rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!loading && visibleQueue.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                No videos match this filter.
              </div>
            ) : null}
          </div>
        </section>

        {selectedVideo ? (
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:h-fit">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Moderating</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{selectedVideo.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {selectedVideo.category} · {selectedVideo.duration || "duration unknown"} · {selectedVideo.views}
            </p>

            <div className="mt-5 overflow-hidden rounded-lg bg-slate-950">
              {selectedVideo.source === "YOUTUBE" && selectedVideo.youtubeId ? (
                <YouTubePlayer
                  videoId={selectedVideo.youtubeId}
                  title={selectedVideo.title}
                  className="aspect-video w-full"
                />
              ) : selectedVideo.videoUrl ? (
                <video
                  key={selectedVideo.videoId}
                  src={selectedVideo.videoUrl}
                  poster={selectedVideo.thumbnailUrl}
                  controls
                  className="aspect-video w-full bg-slate-950"
                />
              ) : (
                <VideoPoster kind="video" className="aspect-video" player />
              )}
            </div>

            {selectedVideo.description && selectedVideo.description !== "No description provided." ? (
              <p className="mt-4 text-sm leading-6 text-slate-700">{selectedVideo.description}</p>
            ) : null}

            <textarea
              value={selectedVideo.notes}
              onChange={(event) => updateSelectedNotes(event.target.value)}
              rows={4}
              placeholder="Optional notes for the creator"
              className="field mt-5 px-4 py-3 text-sm"
            />
            <div className="mt-4 grid gap-2">
              <button
                onClick={() => updateVideo(selectedVideo.videoId, { status: "Approved" }, `${selectedVideo.title} approved and published.`)}
                className="pressable rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Approve and publish
              </button>
              <button
                onClick={() => updateVideo(selectedVideo.videoId, { status: "Rejected" }, `${selectedVideo.title} rejected and creator notified.`)}
                className="pressable rounded-lg bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700"
              >
                Reject and notify
              </button>
            </div>
          </aside>
        ) : null}
      </div>
    </AdminShell>
  );
}
