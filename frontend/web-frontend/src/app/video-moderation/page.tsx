"use client";

import { AdminGuard } from "@/lib/auth";

const videos = [
  { title: "Spring Boot REST API guide", uploader: "alice_dev", status: "Under review", uploaded: "2 min ago" },
  { title: "Docker in 10 minutes", uploader: "carol_s", status: "Under review", uploaded: "1h ago" },
  { title: "Kafka streams deep dive", uploader: "alice_dev", status: "Approved", uploaded: "Yesterday" },
];

export default function VideoModerationPage() {
  return (
    <AdminGuard>
      <VideoModerationContent />
    </AdminGuard>
  );
}

function VideoModerationContent() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-sky-400">VideoRec — Admin</p>
            <h1 className="mt-3 text-3xl font-semibold">Moderate videos</h1>
          </div>
          <nav className="flex items-center gap-4 text-sm text-slate-300">
            <span>Dashboard</span>
            <button className="rounded-full px-4 py-2 text-slate-300 transition hover:bg-slate-800">Users</button>
            <button className="rounded-full bg-slate-800 px-4 py-2 text-slate-100 transition">Videos 4</button>
            <button className="rounded-full px-4 py-2 text-slate-300 transition hover:bg-slate-800">Back to site</button>
          </nav>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Pending review</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">Moderation queue</h2>
              </div>
              <div className="min-w-[190px] rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                <select className="w-full bg-transparent outline-none">
                  <option>Pending review</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              {videos.map((video) => (
                <div key={video.title} className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">{video.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{video.uploader} · {video.uploaded}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">{video.status}</span>
                      <button className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/20">Approve</button>
                      <button className="rounded-full bg-rose-500/15 px-4 py-2 text-sm text-rose-300 transition hover:bg-rose-500/20">Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-100">Moderating — “Spring Boot REST API guide”</h2>
            <textarea
              rows={6}
              placeholder="Optional notes (shown to uploader on rejection)..."
              className="mt-5 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm text-slate-100 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25"
            />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="flex-1 rounded-3xl border border-slate-700 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">
                Approve — publish video
              </button>
              <button className="flex-1 rounded-3xl border border-rose-500 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20">
                Reject — notify uploader
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
