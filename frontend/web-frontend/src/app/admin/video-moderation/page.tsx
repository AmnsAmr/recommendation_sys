"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { VideoPoster } from "@/components/video-poster";
import { videos } from "@/lib/mock-data";

const initialQueue = videos.slice(0, 4).map((video, index) => ({
  ...video,
  status: index < 2 ? "Under review" : "Approved",
  uploaded: index === 0 ? "2 min ago" : index === 1 ? "1h ago" : "Yesterday",
  notes: "",
}));

type QueueVideo = (typeof initialQueue)[number];

export default function VideoModerationPage() {
  const [queue, setQueue] = useState<QueueVideo[]>(initialQueue);
  const [filter, setFilter] = useState("All videos");
  const [selectedTitle, setSelectedTitle] = useState(initialQueue[0]?.title || "");
  const [notice, setNotice] = useState("");

  const visibleQueue = useMemo(
    () => queue.filter((video) => filter === "All videos" || video.status === filter),
    [filter, queue],
  );

  const selectedVideo = queue.find((video) => video.title === selectedTitle) || queue[0];

  const updateVideo = (title: string, changes: Partial<QueueVideo>, message: string) => {
    setQueue((current) => current.map((video) => (video.title === title ? { ...video, ...changes } : video)));
    setSelectedTitle(title);
    setNotice(message);
  };

  const updateSelectedNotes = (notes: string) => {
    setQueue((current) =>
      current.map((video) => (video.title === selectedVideo.title ? { ...video, notes } : video)),
    );
  };

  return (
    <AdminShell title="Video moderation">
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
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
            {visibleQueue.map((video) => (
              <article
                key={video.title}
                className={`grid gap-4 rounded-lg border p-3 sm:grid-cols-[180px_1fr] ${
                  selectedVideo?.title === video.title ? "border-teal-300 bg-teal-50/50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <VideoPoster kind={video.poster} duration={video.duration} className="aspect-video" />
                <div className="min-w-0">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">{video.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {video.creator} - {video.uploaded}
                      </p>
                    </div>
                    <span className="w-fit rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-700">{video.status}</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{video.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => updateVideo(video.title, { status: "Approved" }, `${video.title} approved.`)}
                      className="pressable rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateVideo(video.title, { status: "Rejected" }, `${video.title} rejected.`)}
                      className="pressable rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-700"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTitle(video.title);
                        setNotice(`Opened details for ${video.title}.`);
                      }}
                      className="pressable rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Open details
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {selectedVideo ? (
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:h-fit">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Moderating</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{selectedVideo.title}</h2>
            <VideoPoster kind={selectedVideo.poster} className="mt-5 aspect-video" player />
            <textarea
              value={selectedVideo.notes}
              onChange={(event) => updateSelectedNotes(event.target.value)}
              rows={6}
              placeholder="Optional notes for the creator"
              className="field mt-5 px-4 py-3 text-sm"
            />
            <div className="mt-4 grid gap-2">
              <button
                onClick={() => updateVideo(selectedVideo.title, { status: "Approved" }, `${selectedVideo.title} approved and published.`)}
                className="pressable rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Approve and publish
              </button>
              <button
                onClick={() => updateVideo(selectedVideo.title, { status: "Rejected" }, `${selectedVideo.title} rejected and creator notified.`)}
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
