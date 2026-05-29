"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/app-shell";
import { YouTubePlayer } from "@/components/youtube-player";
import { VideoCard } from "@/components/video-card";
import { VideoPoster } from "@/components/video-poster";
import { api, getAuthToken } from "@/lib/api";
import { saveHistory } from "@/lib/history";
import { comments, videos } from "@/lib/mock-data";
import { fromApiVideo, type UiVideo } from "@/lib/video-mapper";

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
  const search = useSyncExternalStore(subscribeToUrlChange, readSearch, () => "");
  const requestedVideo = useMemo(() => {
    const value = new URLSearchParams(search).get("video");
    const fallback = videos.find((video) => video.title === value) || videos[0];
    return {
      ...fallback,
      id: value || fallback.title,
      durationSeconds: parseDuration(fallback.duration),
      source: "own" as const,
    };
  }, [search]);
  const [resolvedVideos, setResolvedVideos] = useState<Record<string, UiVideo>>({});
  const currentVideo = resolvedVideos[requestedVideo.id] ?? requestedVideo;
  const shouldFetchVideo = requestedVideo.id !== requestedVideo.title;
  const cachedVideo = resolvedVideos[requestedVideo.id];

  useEffect(() => {
    if (!requestedVideo.id || !shouldFetchVideo || cachedVideo) {
      return;
    }

    let active = true;
    api.getVideo(requestedVideo.id)
      .then((video) => {
        if (active) {
          setResolvedVideos((current) => {
            if (current[requestedVideo.id]) {
              return current;
            }

            return {
              ...current,
              [requestedVideo.id]: fromApiVideo(video),
            };
          });
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [cachedVideo, requestedVideo.id, shouldFetchVideo]);

  return <WatchExperience key={currentVideo.id} currentVideo={currentVideo} />;
}

function WatchExperience({ currentVideo }: { currentVideo: UiVideo }) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});
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
  const [similarVideos, setSimilarVideos] = useState<UiVideo[]>([]);
  const [similarLoading, setSimilarLoading] = useState(currentVideo.id !== currentVideo.title);
  const fallbackVideos = useMemo(
    () =>
      videos
        .filter((video) => video.title !== currentVideo.title)
        .slice(0, 7)
        .map((video) => ({
          ...video,
          id: video.title,
          durationSeconds: parseDuration(video.duration),
          source: "own" as const,
        })),
    [currentVideo.title],
  );
  const canFetchRecommendations = currentVideo.id !== currentVideo.title;

  useEffect(() => {
    setLikeCount(currentVideo.likeCount ?? 0);
    setDislikeCount(currentVideo.dislikeCount ?? 0);
    setLiked(false);
    setDisliked(false);

    if (!getAuthToken() || !currentVideo.id || currentVideo.id === currentVideo.title) {
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
  }, [currentVideo.id, currentVideo.title, currentVideo.likeCount, currentVideo.dislikeCount]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!currentVideo.id || !canFetchRecommendations) {
      return;
    }

    let active = true;
    api.getSimilarVideos(currentVideo.id)
      .then(async (res) => {
        const similarIds = res.similarVideoIds
          .filter((id) => id && id !== currentVideo.id)
          .slice(0, 5);
        if (!similarIds.length) {
          if (active) {
            setSimilarVideos([]);
            setSimilarLoading(false);
          }
          return;
        }

        const promises = similarIds.map((id) => api.getVideo(id).catch(() => null));
        const vids = await Promise.all(promises);
        if (active) {
          setSimilarVideos(vids.filter((video): video is Awaited<ReturnType<typeof api.getVideo>> => video !== null).map(fromApiVideo));
          setSimilarLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setSimilarVideos([]);
          setSimilarLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [canFetchRecommendations, currentVideo.id]);

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
                        type="button"
                        onClick={() =>
                          setCommentLikes((current) => ({
                            ...current,
                            [comment.author]: !active,
                          }))}
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
              {similarVideos.length > 0 ? (
                similarVideos.map((video) => (
                  <VideoCard key={video.id} video={video} compact />
                ))
              ) : fallbackVideos.length > 0 ? (
                fallbackVideos.map((video) => (
                  <VideoCard key={video.id} video={video} compact />
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  {similarLoading ? "Loading recommendations..." : "No related videos yet."}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
