"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { VideoCard } from "@/components/video-card";
import { api } from "@/lib/api";
import { categories, videos } from "@/lib/mock-data";
import { fromApiVideo, fromYouTubeVideo, type UiVideo } from "@/lib/video-mapper";
import { getFallbackYouTubeVideos } from "@/lib/youtube-fallback";

export default function HomepagePage() {
  return (
    <Suspense fallback={<AppShell><p className="text-sm font-bold text-slate-500">Loading videos...</p></AppShell>}>
      <HomepageContent />
    </Suspense>
  );
}

function HomepageContent() {
  const searchParams = useSearchParams();
  const [active, setActive] = useState("For you");
  const [remoteVideos, setRemoteVideos] = useState<UiVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const query = searchParams.get("q")?.trim() || "";

  useEffect(() => {
    const genre = searchParams.get("genre");
    if (genre && categories.includes(genre)) {
      setActive(genre);
    }
  }, [searchParams]);

  useEffect(() => {
    let activeRequest = true;
    setLoading(true);
    setNotice("");

    const youtubeQuery = query || (active === "For you" ? "technology music education" : active);
    const request = api.searchYouTubeVideos(youtubeQuery, 12);

    request
      .then((response) => {
        if (activeRequest) {
          const youtubeVideos = response.videos.map(fromYouTubeVideo);
          if (youtubeVideos.length > 0) {
            setRemoteVideos(youtubeVideos);
            return;
          }

          api.getCatalog({ categoryId: active === "For you" ? undefined : active })
            .then((catalog) => {
              if (activeRequest) {
                setRemoteVideos(catalog.videos.map(fromApiVideo));
              }
            })
            .catch(() => {
              if (activeRequest) {
                setRemoteVideos(getFallbackYouTubeVideos());
                setNotice("Backend unavailable, showing embedded YouTube demo videos.");
              }
            });
        }
      })
      .catch(() => {
        if (activeRequest) {
          setRemoteVideos(getFallbackYouTubeVideos());
          setNotice("YouTube API unavailable, showing embedded YouTube demo videos.");
        }
      })
      .finally(() => {
        if (activeRequest) {
          setLoading(false);
        }
      });

    return () => {
      activeRequest = false;
    };
  }, [active, query]);

  const fallbackVideos = useMemo(
    () =>
      (active === "For you" ? videos : videos.filter((video) => video.category === active)).map((video, index) => ({
        ...video,
        id: video.title,
        durationSeconds: 0,
        source: "own",
      })),
    [active],
  );
  const visibleVideos = remoteVideos.length > 0 ? remoteVideos : fallbackVideos;

  return (
    <AppShell>
      <div className="sticky top-16 z-30 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActive(category)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition ${
                active === category
                  ? "bg-slate-950 text-white"
                  : "bg-slate-200 text-slate-800 hover:bg-slate-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-950">{query ? `Search: ${query}` : active === "For you" ? "Recommended" : active}</h1>
            <p className="mt-1 text-sm text-slate-500">{loading ? "Loading from backend..." : notice || "Catalog loaded through the API gateway."}</p>
          </div>
        </div>

        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
          {visibleVideos.map((video, index) => (
            <div key={video.title} className="animate-in" style={{ animationDelay: `${index * 45}ms` }}>
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
