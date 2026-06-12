"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { VideoCard } from "@/components/video-card";
import { api, getAuthToken } from "@/lib/api";
import type { UiVideo } from "@/lib/video-mapper";
import { fromApiVideo } from "@/lib/video-mapper";
import type { UserPreference } from "@/lib/types";
import {
  forYouCategoryLabel,
  formatVideoCategoryLabel,
  homepageCategories as categories,
  resolveVideoCategoryId,
} from "@/lib/video-categories";

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

function noticeForStrategy(strategy?: string) {
  const normalized = strategy?.trim().toLowerCase();
  if (normalized?.startsWith("hybrid")) {
    return "Recommendations tuned from your recent activity.";
  }

  return "Recommendations based on the interests you picked when creating your account.";
}

function buildInterestGroups(preferences: UserPreference[]) {
  const grouped = new Map<string, string>();

  preferences.forEach((preference) => {
    const backendCategoryId = resolveVideoCategoryId(preference.category);
    if (!backendCategoryId) {
      return;
    }

    if (!grouped.has(backendCategoryId)) {
      grouped.set(backendCategoryId, formatVideoCategoryLabel(backendCategoryId));
    }
  });

  return Array.from(grouped.entries()).map(([backendCategoryId, title]) => ({
    backendCategoryId,
    title,
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  // Backend category IDs the user declared at registration. Used by loadMore in
  // "For You" mode so infinite-scroll keeps respecting interests instead of
  // dumping the unfiltered catalog (which is entertainment-heavy from seed data).
  const [preferredCategoryIds, setPreferredCategoryIds] = useState<string[]>([]);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [notice, setNotice] = useState("");
  const routeGenre = searchParams.get("genre");
  const active = selectedCategory ?? (routeGenre && categories.includes(routeGenre) ? routeGenre : forYouCategoryLabel);
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

    const fetchSection = async (
      title: string,
      categoryId: string | null,
      preferred: boolean,
    ): Promise<FeedSection | null> => {
      if (categoryId) {
        try {
          const coldStart = await api.getColdStartRecommendations(categoryId);
          const coldVideos = await fetchVideosByIds((coldStart.videoIds || []).slice(0, 16));

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
      }

      const fallback = await api.getCatalog({ categoryId: categoryId ?? undefined, size: 16 });
      if ((fallback.videos || []).length === 0) {
        return null;
      }

      return {
        id: `${categoryId ?? "catalog"}-catalog`,
        title,
        subtitle: preferred && categoryId
          ? `Seeded ${title} videos while recommendations warm up.`
          : categoryId
            ? `Showing seeded ${title} videos from the catalog.`
            : "Showing videos from the seeded catalog while recommendations warm up.",
        videos: fallback.videos.map(fromApiVideo),
      };
    };

    const fetchFeed = async (): Promise<FeedResult> => {
      setLoading(true);
      setPage(0);
      setHasMore(true);
      setNotice("");
      setPreferredCategoryIds([]);

      if (query) {
        const res = await api.searchVideos(query, { page: 0, size: 16 });
        setHasMore((res.videos || []).length >= 16);
        return {
          mode: "grid",
          videos: (res.videos || []).map(fromApiVideo),
          notice: `Showing search results for "${query}".`,
        };
      }

      const token = getAuthToken();
      const userJson = localStorage.getItem("user");

      if (active === forYouCategoryLabel && token && userJson) {
        let userId: string | null = null;
        try {
          const parsed = JSON.parse(userJson) as { userId?: string };
          userId = parsed.userId ?? null;
        } catch {
          // Unparseable user blob; skip the personalized branch entirely.
        }

        if (userId) {
          // Step 0: fetch profile up front so we know the user's declared categories.
          // Needed for both the interest-sections fallback AND for loadMore's
          // round-robin so infinite scroll keeps reflecting preferences instead of
          // dumping the unfiltered (entertainment-heavy) catalog. api.getProfile
          // caches per userId, so this is free after the first call within the TTL.
          let preferredGroups: Array<{ backendCategoryId: string; title: string }> = [];
          try {
            const profile = await api.getProfile(userId);
            preferredGroups = buildInterestGroups(profile.preferences || []).slice(0, 4);
            setPreferredCategoryIds(preferredGroups.map((group) => group.backendCategoryId));
          } catch {
            // Profile fetch failed — fall through; loadMore will degrade to the catalog.
          }

          // Step 1: try the personalized engine. A failure here (e.g. the user.registered
          // Kafka event hasn't propagated to the recommendation service yet) must NOT
          // bypass the interest-sections fallback below — otherwise every new user falls
          // through to the unfiltered global catalog and sees the same videos.
          let personalizedVideos: Awaited<ReturnType<typeof api.getVideo>>[] = [];
          let personalizedStrategy: string | undefined;
          try {
            const personalized = await api.getPersonalizedRecommendations(userId);
            personalizedStrategy = personalized.strategy;
            personalizedVideos = await fetchVideosByIds((personalized.videoIds || []).slice(0, 24));
          } catch {
            // Recommendation service unavailable or not yet warm; fall through.
          }

          if (personalizedVideos.length > 0) {
            return {
              mode: "grid",
              videos: personalizedVideos.map(fromApiVideo),
              notice: noticeForStrategy(personalizedStrategy),
            };
          }

          // Step 2: build interest sections from the user's declared preferences.
          if (preferredGroups.length > 0) {
            try {
              const sections = (await Promise.all(
                preferredGroups.map((group) => fetchSection(group.title, group.backendCategoryId, true)),
              )).filter((section): section is FeedSection => section !== null);

              if (sections.length > 0) {
                return {
                  mode: "sections",
                  sections,
                  notice: "Built from the interests you picked when creating your account.",
                };
              }
            } catch {
              // Section build failed; fall through to generic seeded feed.
            }
          }
        }
      }

      const categoryId = active === forYouCategoryLabel ? null : resolveVideoCategoryId(active);
      const section = await fetchSection(active, categoryId, active === forYouCategoryLabel);

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

  const showInterestSections = active === forYouCategoryLabel && !query && feedSections.length > 0;
  const loadMore = async () => {
    if (loadingMore || loading || showInterestSections || !hasMore) {
      return;
    }

    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      let response;
      if (query) {
        response = await api.searchVideos(query, { page: nextPage, size: 16 });
      } else if (active === forYouCategoryLabel && preferredCategoryIds.length > 0) {
        // Round-robin through the user's declared categories. Without this,
        // For You's load-more would call getCatalog with no categoryId and
        // surface the global catalog (~entertainment-heavy from seed data),
        // ignoring preferences entirely.
        const len = preferredCategoryIds.length;
        const idx = (nextPage - 1) % len;
        const innerPage = Math.floor((nextPage - 1) / len);
        response = await api.getCatalog({ categoryId: preferredCategoryIds[idx], page: innerPage, size: 16 });
      } else {
        const categoryId = active === forYouCategoryLabel ? undefined : resolveVideoCategoryId(active) ?? undefined;
        response = await api.getCatalog({ categoryId, page: nextPage, size: 16 });
      }
      const nextVideos = (response.videos || []).map(fromApiVideo);
      setRemoteVideos((current) => {
        const merged = [...current];
        nextVideos.forEach((video) => {
          if (!merged.some((candidate) => candidate.id === video.id)) {
            merged.push(video);
          }
        });
        return merged;
      });
      setPage(nextPage);
      setHasMore((response.videos || []).length >= 16);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || showInterestSections) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "420px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  });

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
            <h1 className="text-2xl font-black text-slate-950">{query ? `Search: ${query}` : active === forYouCategoryLabel ? "Recommended" : active}</h1>
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
                <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
            <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {remoteVideos.map((video, index) => (
              <div key={video.id} className="animate-in" style={{ animationDelay: `${index * 45}ms` }}>
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        )}
        {!showInterestSections && remoteVideos.length > 0 ? (
          <div ref={loadMoreRef} className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loading || loadingMore || !hasMore}
              className="pressable rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-800 shadow-sm hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? "Loading more..." : hasMore ? "Load more videos" : "You are all caught up"}
            </button>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
