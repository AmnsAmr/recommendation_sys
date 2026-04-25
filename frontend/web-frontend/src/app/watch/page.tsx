"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/app-shell";
import { VideoCard } from "@/components/video-card";
import { VideoPoster } from "@/components/video-poster";
import { saveHistory } from "@/lib/history";
import { comments, videos } from "@/lib/mock-data";

function subscribeToUrlChange(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener("videorec-url-change", onChange);

  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("videorec-url-change", onChange);
  };
}

function readSearch() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.search;
}

function parseDuration(duration: string) {
  const [minutes, seconds] = duration.split(":").map(Number);
  return minutes * 60 + seconds;
}

function formatTime(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function WatchPage() {
  const search = useSyncExternalStore(subscribeToUrlChange, readSearch, () => "");
  const currentVideo = useMemo(() => {
    const title = new URLSearchParams(search).get("video");
    return videos.find((video) => video.title === title) || videos[0];
  }, [search]);

  return <WatchExperience key={currentVideo.title} currentVideo={currentVideo} />;
}

function WatchExperience({ currentVideo }: { currentVideo: (typeof videos)[number] }) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const durationSeconds = parseDuration(currentVideo.duration);
  const progressPct = Math.min((progress / durationSeconds) * 100, 100);

  useEffect(() => {
    if (!playing) {
      return;
    }

    const interval = window.setInterval(() => {
      setProgress((value) => {
        if (value >= durationSeconds) {
          window.clearInterval(interval);
          setPlaying(false);
          return durationSeconds;
        }

        return value + 1;
      });
    }, 350);

    return () => window.clearInterval(interval);
  }, [durationSeconds, playing]);

  const triggerReaction = (value: string) => {
    setReaction(value);
    window.setTimeout(() => setReaction(null), 720);
  };

  const togglePlay = () => {
    setPlaying((value) => !value);
    if (!playing) {
      saveHistory({
        title: currentVideo.title,
        watchedAt: new Date().toISOString(),
        progress: Math.max(progressPct, 1),
      });
    }
    triggerReaction(playing ? "paused" : "playing");
  };

  return (
    <AppShell>
      <div className="animate-in grid gap-6 xl:grid-cols-[minmax(0,1fr)_410px]">
        <section className="min-w-0">
          <div className="overflow-hidden rounded-2xl bg-slate-950 shadow-xl">
            <div className="relative">
              <VideoPoster kind={currentVideo.poster} className="aspect-video rounded-none" player />
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 grid place-items-center text-white"
                aria-label={playing ? "Pause video" : "Play video"}
              >
                <span className="pressable rounded-full bg-white/95 px-7 py-4 text-sm font-black uppercase tracking-wide text-slate-950 shadow-2xl">
                  {playing ? "Pause" : "Play"}
                </span>
              </button>
              {playing ? (
                <div className="absolute left-4 top-4 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-950">
                  Playing now
                </div>
              ) : null}
              <div className="absolute bottom-4 left-4 right-4 h-1 rounded-full bg-white/25">
                <div className="h-full rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="absolute bottom-7 left-4 right-4 flex justify-between text-xs font-bold text-white/85">
                <span>{formatTime(progress)}</span>
                <span>{currentVideo.duration}</span>
              </div>
              {reaction ? (
                <div className="reaction-burst absolute left-1/2 top-1/2 -translate-x-1/2 rounded-full bg-white/95 px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-2xl">
                  {reaction}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 bg-slate-50 p-1">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-sm font-bold text-teal-700">{currentVideo.category}</p>
                <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{currentVideo.title}</h1>
                <p className="mt-2 text-sm text-slate-500">
                  {currentVideo.views} views - {currentVideo.uploadedAt} - {currentVideo.score} match
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setLiked((value) => !value);
                    setDisliked(false);
                    triggerReaction("liked");
                  }}
                  className={`pressable rounded-lg px-4 py-2 text-sm font-bold transition ${
                    liked ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span aria-hidden="true">▲</span> Like {342 + (liked ? 1 : 0)}
                </button>
                <button
                  onClick={() => {
                    setDisliked((value) => !value);
                    setLiked(false);
                    triggerReaction("noted");
                  }}
                  className={`pressable rounded-lg px-4 py-2 text-sm font-bold transition ${
                    disliked ? "bg-rose-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span aria-hidden="true">▼</span> Dislike
                </button>
                <button
                  onClick={() => triggerReaction("link ready")}
                  className="pressable rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <span aria-hidden="true">↗</span> Share
                </button>
                <button
                  onClick={() => {
                    setSaved((value) => !value);
                    triggerReaction(saved ? "removed" : "saved");
                  }}
                  className={`pressable rounded-lg px-4 py-2 text-sm font-bold transition ${
                    saved ? "bg-teal-700 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span aria-hidden="true">{saved ? "★" : "☆"}</span> {saved ? "Saved" : "Save"}
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-2 rounded-xl bg-white p-2 sm:grid-cols-4">
              {[
                ["◆", "Smart", "Better ranking"],
                ["✓", "Clear", "Good lesson"],
                ["★", "Deep", "Save for later"],
                ["↻", "Fresh", "More like this"],
              ].map(([icon, label, detail]) => (
                <button
                  key={label}
                  onClick={() => triggerReaction(label.toLowerCase())}
                  className="pressable rounded-lg bg-white px-3 py-3 text-left shadow-sm hover:bg-teal-50"
                >
                  <span className="block text-sm font-black text-slate-950">{icon} {label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{detail}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-sm font-bold text-white">A</div>
                <div>
                  <p className="font-bold text-slate-950">{currentVideo.channel}</p>
                  <p className="text-sm text-slate-500">12.3k subscribers</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSubscribed((value) => !value);
                  triggerReaction(subscribed ? "unsubscribed" : "subscribed");
                }}
                className={`pressable rounded-lg px-4 py-2 text-sm font-bold ${
                  subscribed ? "bg-teal-700 text-white" : "bg-slate-950 text-white hover:bg-teal-800"
                }`}
              >
                <span aria-hidden="true">{subscribed ? "✓" : "+"}</span> {subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-white p-4">
              <p className={`text-sm leading-6 text-slate-700 ${expanded ? "" : "line-clamp-2"}`}>
                {currentVideo.description} This lesson connects API design, persistence, security, and deployment into one workflow that fits the recommendation platform architecture.
              </p>
              <button onClick={() => setExpanded((value) => !value)} className="pressable mt-2 rounded-md text-sm font-bold text-teal-700">
                {expanded ? "Show less" : "Show more"}
              </button>
            </div>
          </div>

          <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Comments</h2>
            <div className="mt-4 flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">Y</div>
              <input className="field h-10 px-3 text-sm" placeholder="Add a thoughtful comment" />
            </div>
            <div className="mt-5 divide-y divide-slate-100">
              {comments.map((comment, index) => {
                const active = commentLikes[comment.author] || false;
                return (
                <article key={comment.author} className="animate-in flex gap-3 py-4" style={{ animationDelay: `${index * 80}ms` }}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                    {comment.avatar}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-950">{comment.author}</p>
                      <p className="text-xs text-slate-500">{comment.timestamp}</p>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{comment.text}</p>
                    <button
                      onClick={() =>
                        setCommentLikes((current) => ({
                          ...current,
                          [comment.author]: !active,
                        }))
                      }
                      className={`pressable mt-2 rounded-md px-2 py-1 text-xs font-bold ${
                        active ? "bg-teal-50 text-teal-800" : "text-slate-500 hover:text-teal-700"
                      }`}
                    >
                      <span aria-hidden="true">▲</span> Like {comment.likes + (active ? 1 : 0)}
                    </button>
                  </div>
                </article>
              );
              })}
            </div>
          </section>
        </section>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Up next</h2>
            <div className="mt-4 grid gap-3">
              {videos.filter((video) => video.title !== currentVideo.title).slice(0, 7).map((video) => (
                <VideoCard key={video.title} video={video} compact />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
