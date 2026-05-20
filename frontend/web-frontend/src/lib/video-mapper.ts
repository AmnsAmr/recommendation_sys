import type { ApiVideo } from "@/lib/types";

export type UiVideo = {
  id: string;
  title: string;
  creator: string;
  channel: string;
  views: string;
  uploadedAt: string;
  duration: string;
  durationSeconds: number;
  category: string;
  score: string;
  poster?: string;
  thumbnailUrl?: string;
  source: string;
  youtubeId?: string;
  url?: string;
  description: string;
};

function formatDuration(seconds = 0) {
  if (!seconds || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatViews(count = 0) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }

  return String(count);
}

function formatUploadedAt(value?: string) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function humanizeCategory(value?: string) {
  if (!value) {
    return "Video";
  }

  const normalized = value.trim().toLowerCase();
  const known: Record<string, string> = {
    "science-technology": "Science & Technology",
    "howto-style": "How-to & Style",
    "travel-events": "Travel & Events",
    gaming: "Gaming",
    education: "Education",
    sports: "Sports",
    music: "Music",
    entertainment: "Entertainment",
    news: "News",
  };

  if (known[normalized]) {
    return known[normalized];
  }

  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function fromApiVideo(video: ApiVideo): UiVideo {
  const youtubeId = video.youtubeId || (video.source === "youtube" ? video.videoId : undefined);
  const category = humanizeCategory(video.categoryId || video.tags?.[0] || "Video");
  const durationSeconds = video.duration || 0;
  const thumbnailUrl = video.thumbnailUrl || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : undefined);
  const creatorSeed = video.uploaderId?.slice(0, 8) || (youtubeId ? youtubeId.slice(0, 6) : "catalog");
  const channel = video.uploaderId
    ? `Creator ${video.uploaderId.slice(0, 8)}`
    : video.source === "youtube"
      ? `${category} Archive`
      : "VideoRec";

  return {
    id: video.videoId,
    title: video.title,
    creator: creatorSeed,
    channel,
    views: formatViews(video.viewCount),
    uploadedAt: formatUploadedAt(video.createdAt),
    duration: formatDuration(durationSeconds),
    durationSeconds,
    category,
    score: video.source === "youtube" ? "Seeded" : "Live",
    poster: category.toLowerCase(),
    thumbnailUrl,
    source: video.source || "own",
    youtubeId,
    url: video.url,
    description: video.description || "No description available.",
  };
}
