"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { VideoCard } from "@/components/video-card";
import { api, getAuthToken } from "@/lib/api";
import { categories } from "@/lib/mock-data";
import type { UiVideo } from "@/lib/video-mapper";
import { fromApiVideo } from "@/lib/video-mapper";
import type { UserPreference } from "@/lib/types";

const CATEGORY_TO_BACKEND_CATEGORY: Record<string, string> = {
  Fashion: "howto-style",
  Music: "music",
  Sport: "sports",
  Food: "howto-style",
  Travel: "travel-events",
  Gaming: "gaming",
  Backend: "science-technology",
  Frontend: "science-technology",
  AI: "science-technology",
  Data: "science-technology",
  DevOps: "science-technology",
  Design: "howto-style",
  Education: "education",
};

const DEFAULT_FOR_YOU_CATEGORY = "science-technology";

type FeedSection = {
  id: string;
  title: string;
  subtitle: string;
  videos: UiVideo[];
};

type FeedResult =
  | {
      mode: "grid";
      notice: string;
      videos: UiVideo[];
    }
  | {
      mode: "sections";
      notice: string;
      sections: FeedSection[];
    };

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function toBackendCategory(label: string) {
  return CATEGORY_TO_BACKEND_CATEGORY[label] ?? label.toLowerCase().replace(" & ", "-").replace(" ", "-");
}

function toSectionTitle(labels: string[], backendCategoryId: string) {
  if (labels.length === 0) {
    return backendCategoryId
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return labels.join(" / ");
}

function buildInterestGroups(preferences: UserPreference[]) {
  const grouped = new Map<string, string[]>();

  preferences.forEach((preference) => {
    const label = preference.category?.trim();
    if (!label) {
      return;
    }

    const backendCategoryId = toBackendCategory(label);
    const current = grouped.get(backendCategoryId) ?? [];
    if (!current.includes(label)) {
      current.push(label);
      grouped.set(backendCategoryId, current);
    }
  });

  return Array.from(grouped.entries()).map(([backendCategoryId, labels]) => ({
    backendCategoryId,
    title: toSectionTitle(labels, backendCategoryId),
  }));
}

export default function HomepagePage() {
  return (
    <Suspense fallback={<AppShell><p className="text-sm font-bold text-slate-500">Loading videos...</p></AppShell>}>
      <HomepageContent />
    </Suspense>
  );
}

function HomepageContent() {
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [remoteVideos, setRemoteVideos] = useState<UiVideo[]>([]);
  const [feedSections, setFeedSections] = useState<FeedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const routeGenre = searchParams.get("genre");
  const active = selectedCategory ?? (routeGenre && categories.includes(routeGenre) ? routeGenre : "For you");
  const query = searchParams.get("q")?.trim() || "";

  useEffect(() => {
    let activeRequest = true;

    const fetchVideosByIds = async (videoIds: string[]) => {
      if (!videoIds.length) {
        return [];
      }

      const videoPromises = unique(videoIds).map((id) => api.getVideo(id).catch(() => null));
      const videos = await Promise.all(videoPromises);
      return videos.filter((video): video is Awaited<ReturnType<typeof api.getVideo>> => video !== null);
    };

    const fetchSection = async (title: string, categoryId: string, preferred: boolean): Promise<FeedSection | null> => {
      try {
        const coldStart = await api.getColdStartRecommendations(categoryId);
        const coldVideos = await fetchVideosByIds((coldStart.videoIds || []).slice(0, 8));

        if (coldVideos.length > 0) {
          return {
            id: categoryId,
            title,
            subtitle: preferred
              ? `Because you picked ${title} when you created your account.`
              : `Showing ${title} videos from the cold-start feed.`,
            videos: coldVideos.map(fromApiVideo),
          };
        }
      } catch {
        // Fall through to catalog seed when cold-start is still warming up.
      }

      const fallback = await api.getCatalog({ categoryId, size: 8 });
      if ((fallback.videos || []).length === 0) {
        return null;
      }

      return {
        id: `${categoryId}-catalog`,
        title,
        subtitle: preferred
          ? `Seeded ${title} videos while recommendations warm up.`
          : `Showing seeded ${title} videos from the catalog.`,
        videos: fallback.videos.map(fromApiVideo),
      };
    };

    const fetchFeed = async (): Promise<FeedResult> => {
      setLoading(true);
      setNotice("");

      if (query) {
        const res = await api.searchVideos(query);
        return {
          mode: "grid",
          videos: (res.videos || []).map(fromApiVideo),
          notice: `Showing search results for "${query}".`,
        };
      }

      const token = getAuthToken();
      const userJson = localStorage.getItem("user");

      if (active === "For you" && token && userJson) {
        try {
          const user = JSON.parse(userJson) as { userId?: string };
          if (user.userId) {
            const profile = await api.getProfile(user.userId);
            const groups = buildInterestGroups(profile.preferences || []).slice(0, 4);

            if (groups.length > 0) {
              const sections = (await Promise.all(
                groups.map((group) => fetchSection(group.title, group.backendCategoryId, true)),
              )).filter((section): section is FeedSection => section !== null);

              if (sections.length > 0) {
                return {
                  mode: "sections",
                  sections,
                  notice: "Built from the interests you picked when creating your account.",
                };
              }
            }
          }
        } catch {
          // Fall through to generic seeded feed if profile loading fails.
        }
      }

      const categoryId = active === "For you" ? DEFAULT_FOR_YOU_CATEGORY : toBackendCategory(active);
      const section = await fetchSection(active === "For you" ? "For you" : active, categoryId, active === "For you");

      if (section) {
        return {
          mode: "grid",
          videos: section.videos,
          notice: section.subtitle,
        };
      }

      return {
        mode: "grid",
        videos: [],
        notice: "Backend unavailable or no videos found.",
      };
    };

    fetchFeed()
      .then((result) => {
        if (!activeRequest) {
          return;
        }

        if (result.mode === "sections") {
          setFeedSections(result.sections);
          setRemoteVideos([]);
        } else {
          setRemoteVideos(result.videos);
          setFeedSections([]);
        }
        setNotice(result.notice);
      })
      .catch(() => {
        if (activeRequest) {
          setRemoteVideos([]);
          setFeedSections([]);
          setNotice("Backend unavailable or no videos found.");
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

  const showInterestSections = active === "For you" && !query && feedSections.length > 0;

  return (
    <AppShell>
      <div className="sticky top-16 z-30 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
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
            <p className="mt-1 text-sm text-slate-500">{loading ? "Loading from backend..." : notice || "Recommendations from your interests and activity."}</p>
          </div>
        </div>

        {showInterestSections ? (
          <div className="space-y-10">
            {feedSections.map((section) => (
              <section key={section.id}>
                <div className="mb-4">
                  <h2 className="text-xl font-black text-slate-950">{section.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{section.subtitle}</p>
                </div>
                <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
                  {section.videos.map((video, index) => (
                    <div key={video.id} className="animate-in" style={{ animationDelay: `${index * 45}ms` }}>
                      <VideoCard video={video} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
            {remoteVideos.map((video, index) => (
              <div key={video.id} className="animate-in" style={{ animationDelay: `${index * 45}ms` }}>
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
