import type { VideoPosterKind } from "@/components/video-poster";

export type UiVideo = {
  id: string;
  title: string;
  creator: string;
  channel: string;
  views: string;
  uploadedAt: string;
  duration: string;
  category: string;
  score: string;
  poster?: VideoPosterKind;
  description: string;
  source?: "own" | "youtube";
  url?: string | null;
  thumbnailUrl?: string | null;
  youtubeId?: string | null;
  likeCount?: number;
  dislikeCount?: number;
};

export type ApiVideo = {
  videoId: string;
  title: string;
  description: string | null;
  categoryId: string;
  tags: string[];
  source: "own" | "youtube";
  youtubeId: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  duration: number;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  language: string;
  uploaderId: string | null;
  status: "PENDING" | "PROCESSING" | "UNDER_REVIEW" | "READY" | "REJECTED" | "FAILED";
  createdAt: string;
};

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: value >= 10000 ? 0 : 1,
  })
    .format(value)
    .toLowerCase();
}

function formatDuration(seconds: number) {
  const total = Math.max(0, seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) {
    return [hours, minutes, remainingSeconds].map((part) => String(part).padStart(2, "0")).join(":");
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatRelativeDate(isoDate: string) {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMs = new Date(isoDate).getTime() - Date.now();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return formatter.format(diffDays, "day");
  }

  const diffWeeks = Math.round(diffDays / 7);
  return formatter.format(diffWeeks, "week");
}

function normalizeCategory(categoryId: string) {
  if (!categoryId) {
    return "For you";
  }

  return categoryId.charAt(0).toUpperCase() + categoryId.slice(1).toLowerCase();
}

function resolvePoster(categoryId: string): VideoPosterKind {
  const posterByCategory: Record<string, VideoPosterKind> = {
    technology: "api",
    backend: "api",
    data: "streams",
    devops: "docker",
    ai: "ai",
    database: "database",
    frontend: "react",
    fashion: "fashion",
    music: "music",
    sport: "sport",
    food: "food",
    travel: "travel",
    gaming: "gaming",
  };

  return posterByCategory[categoryId.toLowerCase()] || "api";
}

export function mapApiVideoToUiVideo(video: ApiVideo): UiVideo {
  return {
    id: video.videoId,
    title: video.title,
    creator: video.uploaderId ? "creator" : "youtube",
    channel: video.source === "youtube" ? "YouTube import" : "VideoRec creator",
    views: formatCompactNumber(video.viewCount),
    uploadedAt: formatRelativeDate(video.createdAt),
    duration: formatDuration(video.duration),
    category: normalizeCategory(video.categoryId),
    score: "Live",
    poster: resolvePoster(video.categoryId),
    description: video.description || "No description yet.",
    source: video.source,
    url: video.url,
    thumbnailUrl: video.thumbnailUrl,
    youtubeId: video.youtubeId,
    likeCount: video.likeCount,
    dislikeCount: video.dislikeCount,
  };
}
