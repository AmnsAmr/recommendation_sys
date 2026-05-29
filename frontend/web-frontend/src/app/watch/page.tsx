"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { YouTubePlayer } from "@/components/youtube-player";
import { VideoCard } from "@/components/video-card";
import { VideoPoster } from "@/components/video-poster";
import { api, getAuthToken } from "@/lib/api";
import { saveHistory } from "@/lib/history";
import { fromApiVideo, type UiVideo } from "@/lib/video-mapper";

function formatTime(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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

export default function WatchPage() {
  return (
    <Suspense fallback={<AppShell><WatchLoading /></AppShell>}>
      <WatchContent />
    </Suspense>
  );
}

function WatchContent() {
  const searchParams = useSearchParams();
  const requestedVideoId = searchParams.get("video");
  const [currentVideo, setCurrentVideo] = useState<UiVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) {
        setLoading(true);
        setError("");
      }
    });

    const request = requestedVideoId
      ? api.getVideo(requestedVideoId, { force: true })
      : api.getCatalog({ page: 0, size: 1 }).then((response) => {
          const first = response.videos[0];
          if (!first) {
            throw new Error("No videos are available yet.");
          }
          return first;
        });

    request
      .then((video) => {
        if (active) {
          setCurrentVideo(fromApiVideo(video));
        }
      })
      .catch((err) => {
        if (active) {
          setCurrentVideo(null);
          setError(err instanceof Error ? err.message : "Could not load this video.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [requestedVideoId]);

  if (loading) {
    return <AppShell><WatchLoading /></AppShell>;
  }

  if (!currentVideo) {
    return (
      <AppShell>
        <section className="grid min-h-[420px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">Nothing to play</p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">{error || "No video found."}</h1>
            <p className="mt-2 text-sm text-slate-500">Try opening a video from the homepage catalog.</p>
          </div>
        </section>
      </AppShell>
    );
  }

  return <WatchExperience key={currentVideo.id} currentVideo={currentVideo} />;
}

function WatchLoading() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_410px]">
      <div className="animate-pulse rounded-3xl bg-slate-200">
        <div className="aspect-video" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

function WatchExperience({ currentVideo }: { currentVideo: UiVideo }) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resolvedDurationSeconds, setResolvedDurationSeconds] = useState(currentVideo.durationSeconds || 0);
  const [likeCount, setLikeCount] = useState(currentVideo.likeCount ?? 0);
  const [dislikeCount, setDislikeCount] = useState(currentVideo.dislikeCount ?? 0);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const durationSeconds = Math.max(resolvedDurationSeconds, currentVideo.durationSeconds || 0);
  const displayDuration = durationSeconds > 0 ? formatTime(durationSeconds) : currentVideo.duration;
  const progressPct = durationSeconds > 0
    ? Math.min((progress / durationSeconds) * 100, 100)
    : 0;
  const progressRef = useRef(0);
  const lastReportedWatchRef = useRef(0);
  const [sideVideos, setSideVideos] = useState<UiVideo[]>([]);
  const [sidePage, setSidePage] = useState(0);
  const [sideLoading, setSideLoading] = useState(true);
  const [sideHasMore, setSideHasMore] = useState(true);
  const sideLoadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLikeCount(currentVideo.likeCount ?? 0);
    setDislikeCount(currentVideo.dislikeCount ?? 0);
    setLiked(false);
    setDisliked(false);

    if (!getAuthToken() || !currentVideo.id) {
      return;
    }

    let active = true;
    api.getVideoReaction(currentVideo.id)
      .then((response) => {
        if (!active) {
          return;
        }

        setLikeCount(response.likeCount);
        setDislikeCount(response.dislikeCount);
        setLiked(response.action === "like");
        setDisliked(response.action === "dislike");
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [currentVideo.id, currentVideo.likeCount, currentVideo.dislikeCount]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!currentVideo.id) {
      return;
    }

    let active = true;
    setSideVideos([]);
    setSidePage(0);
    setSideHasMore(true);
    setSideLoading(true);

    loadSideVideos(0, true, currentVideo.id).finally(() => {
      if (active) {
        setSideLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [currentVideo.id]);

  const loadMoreSideVideos = async () => {
    if (sideLoading || !sideHasMore) {
      return;
    }

    setSideLoading(true);
    await loadSideVideos(sidePage + 1, false, currentVideo.id);
    setSideLoading(false);
  };

  useEffect(() => {
    const target = sideLoadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void loadMoreSideVideos();
        }
      },
      { rootMargin: "320px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  });

  async function loadSideVideos(page: number, reset: boolean, currentId: string) {
    const collected: UiVideo[] = [];

    if (reset) {
      try {
        const recommendations = await api.getSimilarVideos(currentId, { force: true });
        const recommendedIds = (recommendations.similarVideoIds || [])
          .filter((id) => id && id !== currentId)
          .slice(0, 6);
        const recommended = await Promise.all(recommendedIds.map((id) => api.getVideo(id).catch(() => null)));
        collected.push(
          ...recommended
            .filter((video): video is Awaited<ReturnType<typeof api.getVideo>> => video !== null)
            .map(fromApiVideo),
        );
      } catch {
        // Catalog below keeps the rail useful while recommendations warm up.
      }
    }

    try {
      const catalog = await api.getCatalog({ page, size: 8 });
      const catalogVideos = (catalog.videos || [])
        .map(fromApiVideo)
        .filter((video) => video.id !== currentId);
      collected.push(...catalogVideos);
      setSideHasMore((catalog.videos || []).length >= 8);
      setSidePage(page);
    } catch {
      setSideHasMore(false);
    }

    setSideVideos((current) => {
      const next = reset ? [] : [...current];
      collected.forEach((video) => {
        if (!next.some((candidate) => candidate.id === video.id)) {
          next.push(video);
        }
      });
      return next;
    });
  }

  const updateDuration = useCallback((nextDurationSeconds: number) => {
    if (!Number.isFinite(nextDurationSeconds) || nextDurationSeconds <= 0) {
      return;
    }

    const rounded = Math.round(nextDurationSeconds);
    setResolvedDurationSeconds((current) => (
      current === rounded ? current : rounded
    ));
  }, []);

  const persistHistory = useCallback((watchDuration: number) => {
    const normalizedWatchDuration = Math.max(Math.round(watchDuration), 0);
    const boundedWatchDuration = durationSeconds > 0
      ? Math.min(normalizedWatchDuration, durationSeconds)
      : normalizedWatchDuration;
    const completed = durationSeconds > 0
      ? Math.min((boundedWatchDuration / durationSeconds) * 100, 100)
      : (boundedWatchDuration > 0 ? 1 : 0);

    saveHistory({
      videoId: currentVideo.id,
      title: currentVideo.title,
      watchedAt: new Date().toISOString(),
      progress: Math.max(completed, boundedWatchDuration > 0 ? 1 : 0),
      video: {
        ...currentVideo,
        duration: displayDuration,
        durationSeconds,
        likeCount,
        dislikeCount,
      },
    });
  }, [currentVideo, dislikeCount, displayDuration, durationSeconds, likeCount]);

  const sendWatchEvent = useCallback((watchDuration: number) => {
    if (!getAuthToken() || !currentVideo.id) {
      return;
    }

    const normalizedWatchDuration = Math.max(Math.round(watchDuration), 0);
    if (normalizedWatchDuration <= 0) {
      return;
    }

    const reportedDuration = Math.max(durationSeconds, normalizedWatchDuration, 1);
    const boundedWatchDuration = Math.min(normalizedWatchDuration, reportedDuration);

    api.recordWatch({
      videoId: currentVideo.id,
      watchDuration: boundedWatchDuration,
      videoDuration: reportedDuration,
      completionPct: Math.min(boundedWatchDuration / reportedDuration, 1),
      source: currentVideo.source === "youtube" ? "youtube" : "own",
    }).catch(() => undefined);
  }, [currentVideo.id, currentVideo.source, durationSeconds]);

  const flushWatchProgress = useCallback((watchDuration: number) => {
    const normalizedWatchDuration = Math.max(Math.round(watchDuration), 0);
    if (normalizedWatchDuration <= lastReportedWatchRef.current) {
      return;
    }

    lastReportedWatchRef.current = normalizedWatchDuration;
    sendWatchEvent(normalizedWatchDuration);
  }, [sendWatchEvent]);

  useEffect(() => {
    if (!playing || currentVideo.source === "youtube" || currentVideo.url) {
      return;
    }

    const interval = window.setInterval(() => {
      setProgress((value) => {
        if (value >= durationSeconds) {
          window.clearInterval(interval);
          setPlaying(false);
          persistHistory(durationSeconds);
          flushWatchProgress(durationSeconds);
          return durationSeconds;
        }

        return value + 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [currentVideo.source, currentVideo.url, durationSeconds, flushWatchProgress, persistHistory, playing]);

  useEffect(() => {
    if (!playing) {
      return;
    }

    const heartbeat = window.setInterval(() => {
      if (progressRef.current <= 0) {
        return;
      }

      persistHistory(progressRef.current);
      flushWatchProgress(progressRef.current);
    }, 30000);
    return () => window.clearInterval(heartbeat);
  }, [flushWatchProgress, persistHistory, playing]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (progressRef.current > 0) {
        persistHistory(progressRef.current);
        flushWatchProgress(progressRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flushWatchProgress, persistHistory]);

  useEffect(() => () => {
    if (progressRef.current > 0) {
      persistHistory(progressRef.current);
      flushWatchProgress(progressRef.current);
    }
  }, [flushWatchProgress, persistHistory]);

  const triggerReaction = (value: string) => {
    setReaction(value);
    window.setTimeout(() => setReaction(null), 720);
  };

  const togglePlay = () => {
    setPlaying((value) => !value);
    if (!playing) {
      persistHistory(Math.max(progressRef.current, 1));
    } else {
      persistHistory(progressRef.current);
      flushWatchProgress(progressRef.current);
    }
    triggerReaction(playing ? "paused" : "playing");
  };

  const submitFeedback = async (action: "like" | "dislike") => {
    if (!getAuthToken()) {
      setInteractionMessage("Sign in to save likes and dislikes for recommendations.");
      return;
    }

    setFeedbackPending(true);
    setInteractionMessage(null);

    try {
      const response = await api.likeVideo(currentVideo.id, action);
      setLikeCount(response.likeCount);
      setDislikeCount(response.dislikeCount);
      setLiked(response.action === "like");
      setDisliked(response.action === "dislike");
      setInteractionMessage(response.action === null
        ? "Feedback removed from this video."
        : action === "like"
        ? "Like saved for your recommendations."
        : "Dislike saved for your recommendations.");
      triggerReaction(response.action === null ? "removed" : action === "like" ? "liked" : "noted");
    } catch {
      setInteractionMessage("Could not save your feedback right now.");
    } finally {
      setFeedbackPending(false);
    }
  };

  return (
    <AppShell>
      <div className="animate-in grid gap-6 xl:grid-cols-[minmax(0,1fr)_410px]">
        <section className="min-w-0">
          <div className="overflow-hidden rounded-2xl bg-slate-950 shadow-xl">
            <div className="relative">
              {currentVideo.source === "youtube" && currentVideo.youtubeId ? (
                <YouTubePlayer
                  videoId={currentVideo.youtubeId}
                  title={currentVideo.title}
                  className="aspect-video w-full"
                  onDurationChange={updateDuration}
                  onPlay={(currentTime, actualDuration) => {
                    updateDuration(actualDuration);
                    setPlaying(true);
                    setProgress(currentTime);
                    persistHistory(Math.max(currentTime, 1));
                  }}
                  onPause={(currentTime, actualDuration) => {
                    updateDuration(actualDuration);
                    setPlaying(false);
                    setProgress(currentTime);
                    persistHistory(currentTime);
                    flushWatchProgress(currentTime);
                  }}
                  onProgress={(currentTime, actualDuration) => {
                    updateDuration(actualDuration);
                    setProgress(currentTime);
                  }}
                  onEnded={(actualDuration) => {
                    updateDuration(actualDuration);
                    setPlaying(false);
                    setProgress(actualDuration);
                    persistHistory(actualDuration);
                    flushWatchProgress(actualDuration);
                  }}
                />
              ) : currentVideo.url ? (
                <video
                  className="aspect-video w-full bg-slate-950"
                  src={currentVideo.url}
                  poster={currentVideo.thumbnailUrl}
                  controls
                  onLoadedMetadata={(event) => updateDuration(event.currentTarget.duration)}
                  onPlay={(event) => {
                    setPlaying(true);
                    setProgress(event.currentTarget.currentTime);
                    persistHistory(Math.max(event.currentTarget.currentTime, 1));
                  }}
                  onPause={(event) => {
                    const currentTime = event.currentTarget.currentTime;
                    setPlaying(false);
                    setProgress(currentTime);
                    persistHistory(currentTime);
                    flushWatchProgress(currentTime);
                  }}
                  onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
                  onEnded={(event) => {
                    const finalDuration = event.currentTarget.duration || durationSeconds;
                    setPlaying(false);
                    setProgress(finalDuration);
                    persistHistory(finalDuration);
                    flushWatchProgress(finalDuration);
                  }}
                />
              ) : (
                <>
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
                </>
              )}
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
                <span>{displayDuration}</span>
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
                  type="button"
                  disabled={feedbackPending}
                  onClick={() => submitFeedback("like")}
                  className={`pressable rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                    liked ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span aria-hidden="true">▲</span> Like {formatCount(likeCount)}
                </button>
                <button
                  type="button"
                  disabled={feedbackPending}
                  onClick={() => submitFeedback("dislike")}
                  className={`pressable rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                    disliked ? "bg-rose-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span aria-hidden="true">▼</span> Dislike {formatCount(dislikeCount)}
                </button>
                <button
                  type="button"
                  onClick={() => triggerReaction("link ready")}
                  className="pressable rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <span aria-hidden="true">↗</span> Share
                </button>
                <button
                  type="button"
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

            {interactionMessage ? (
              <p className="mt-3 text-sm font-semibold text-slate-500" aria-live="polite">
                {interactionMessage}
              </p>
            ) : null}

            <div className="mt-5 grid gap-2 rounded-xl bg-white p-2 sm:grid-cols-4">
              {[
                ["◆", "Smart", "Better ranking"],
                ["✓", "Clear", "Good lesson"],
                ["★", "Deep", "Save for later"],
                ["↻", "Fresh", "More like this"],
              ].map(([icon, label, detail]) => (
                <button
                  key={label}
                  type="button"
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
                type="button"
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
              <button type="button" onClick={() => setExpanded((value) => !value)} className="pressable mt-2 rounded-md text-sm font-bold text-teal-700">
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
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
              Comments are not connected to a backend service yet. The player will keep recording watch history and recommendation signals.
            </div>
          </section>
        </section>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Up next</h2>
            <div className="mt-4 grid gap-3">
              {sideVideos.length > 0 ? (
                sideVideos.map((video) => (
                  <VideoCard key={video.id} video={video} compact />
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  {sideLoading ? "Loading recommendations..." : "No related videos yet."}
                </p>
              )}
              {sideLoading && sideVideos.length > 0 ? (
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              ) : null}
              {sideHasMore ? (
                <div ref={sideLoadMoreRef}>
                  <button
                    type="button"
                    onClick={loadMoreSideVideos}
                    disabled={sideLoading}
                    className="pressable w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sideLoading ? "Loading..." : "Load more videos"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
