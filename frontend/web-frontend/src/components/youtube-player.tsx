"use client";

import { useEffect, useRef } from "react";

type YouTubePlayerProps = {
  videoId: string;
  title: string;
  className?: string;
  onDurationChange?: (durationSeconds: number) => void;
  onPlay?: (currentTime: number, durationSeconds: number) => void;
  onPause?: (currentTime: number, durationSeconds: number) => void;
  onProgress?: (currentTime: number, durationSeconds: number) => void;
  onEnded?: (durationSeconds: number) => void;
};

type YouTubeNamespace = {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayerInstance;
  PlayerState: {
    PLAYING: number;
    PAUSED: number;
    ENDED: number;
  };
};

type YouTubePlayerInstance = {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API is only available in the browser."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load the YouTube IFrame API."));
      document.head.appendChild(script);
    }

    const previousHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousHandler?.();
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error("YouTube IFrame API loaded without a Player implementation."));
      }
    };
  });

  return youtubeApiPromise;
}

export function YouTubePlayer({
  videoId,
  title,
  className,
  onDurationChange,
  onPlay,
  onPause,
  onProgress,
  onEnded,
}: YouTubePlayerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onDurationChangeRef = useRef(onDurationChange);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onDurationChangeRef.current = onDurationChange;
  }, [onDurationChange]);

  useEffect(() => {
    onPlayRef.current = onPlay;
  }, [onPlay]);

  useEffect(() => {
    onPauseRef.current = onPause;
  }, [onPause]);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    const hostElement = hostRef.current;
    if (!hostElement) {
      return;
    }

    let player: YouTubePlayerInstance | null = null;
    let mounted = true;
    let intervalId: number | null = null;

    const clearProgressInterval = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const emitProgress = () => {
      if (!player) {
        return;
      }

      const currentTime = Math.max(player.getCurrentTime() || 0, 0);
      const durationSeconds = Math.max(player.getDuration() || 0, 0);
      if (durationSeconds > 0) {
        onDurationChangeRef.current?.(durationSeconds);
      }
      onProgressRef.current?.(currentTime, durationSeconds);
      return { currentTime, durationSeconds };
    };

    loadYouTubeApi()
      .then((YT) => {
        if (!mounted) {
          return;
        }

        player = new YT.Player(hostElement, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              const snapshot = emitProgress();
              if (snapshot) {
                onDurationChangeRef.current?.(snapshot.durationSeconds);
              }
            },
            onStateChange: (event: { data: number }) => {
              if (!player) {
                return;
              }

              const currentTime = Math.max(player.getCurrentTime() || 0, 0);
              const durationSeconds = Math.max(player.getDuration() || 0, 0);
              if (durationSeconds > 0) {
                onDurationChangeRef.current?.(durationSeconds);
              }

              if (event.data === YT.PlayerState.PLAYING) {
                onPlayRef.current?.(currentTime, durationSeconds);
                emitProgress();
                clearProgressInterval();
                intervalId = window.setInterval(() => {
                  emitProgress();
                }, 1000);
                return;
              }

              if (event.data === YT.PlayerState.PAUSED) {
                clearProgressInterval();
                emitProgress();
                onPauseRef.current?.(currentTime, durationSeconds);
                return;
              }

              if (event.data === YT.PlayerState.ENDED) {
                clearProgressInterval();
                emitProgress();
                onEndedRef.current?.(durationSeconds);
              }
            },
          },
        });
      })
      .catch(() => {
        // Keep the watch page usable even if the YouTube API is unavailable.
      });

    return () => {
      mounted = false;
      clearProgressInterval();
      player?.destroy();
      hostElement.innerHTML = "";
    };
  }, [videoId]);

  return (
    <div
      ref={hostRef}
      className={className}
      aria-label={title}
    />
  );
}
