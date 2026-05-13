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

export function fromApiVideo(video: ApiVideo): UiVideo {
  const category = video.categoryId || video.tags?.[0] || "Video";
  const durationSeconds = video.duration || 0;

  return {
    id: video.videoId,
    title: video.title,
    creator: video.uploaderId?.slice(0, 8) || "creator",
    channel: video.uploaderId ? `Creator ${video.uploaderId.slice(0, 8)}` : video.source === "youtube" ? "YouTube catalog" : "VideoRec",
    views: formatViews(video.viewCount),
    uploadedAt: formatUploadedAt(video.createdAt),
    duration: formatDuration(durationSeconds),
    durationSeconds,
    category,
    score: "Live",
    poster: category.toLowerCase(),
    thumbnailUrl: video.thumbnailUrl,
    source: video.source || "own",
    youtubeId: video.youtubeId,
    url: video.url,
    description: video.description || "No description available.",
  };
}
