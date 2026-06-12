import type { ApiVideo, YouTubeVideo } from "@/lib/types";
import { formatVideoCategoryLabel } from "@/lib/video-categories";

export type UiVideo = {
  id: string;
  title: string;
  creator: string;
  channel: string;
  views: string;
  viewCount?: number;
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
  likeCount?: number;
  dislikeCount?: number;
  // Original uploader UUID — kept so client components can fetch the user's
  // real displayName via useUploaderName() instead of showing "Creator <uuid8>".
  uploaderId?: string;
};

function formatDuration(seconds = 0) {
  if (!seconds || seconds < 0) {
    // Empty string lets callers hide the badge entirely instead of showing a misleading "0:00".
    // YouTube-seeded videos arrive with duration=0 because the seeder doesn't probe.
    return "";
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

function isLikelyUrl(value: string) {
  // Accept absolute URLs, protocol-relative URLs, and root-relative paths.
  // Rejects junk like "5498" that the seeder occasionally lands in thumbnailUrl,
  // so the youtubeId fallback below can take over.
  return /^(https?:)?\/\//i.test(value) || value.startsWith("/");
}

function upgradeThumb(url?: string, youtubeId?: string) {
  const safe = url && isLikelyUrl(url) ? url : undefined;

  if (safe && /i\.ytimg\.com|img\.youtube\.com/.test(safe)) {
    return safe.replace(/\/(default|mqdefault|hqdefault|sddefault)\.jpg/, "/maxresdefault.jpg");
  }
  if (!safe && youtubeId) {
    return `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;
  }
  return safe;
}

export function fromApiVideo(video: ApiVideo): UiVideo {
  const youtubeId = video.youtubeId || (video.source === "youtube" ? video.videoId : undefined);
  const category = formatVideoCategoryLabel(video.categoryId || video.tags?.[0] || "Video");
  const durationSeconds = video.duration || 0;
  const thumbnailUrl = upgradeThumb(video.thumbnailUrl, youtubeId);
  const creatorSeed = video.uploaderId?.slice(0, 8) || (youtubeId ? youtubeId.slice(0, 6) : "catalog");
  const channel = video.uploaderId
    ? `Creator ${video.uploaderId.slice(0, 8)}`
    : video.source === "youtube"
      // Used to be `${category} Archive`, which produced "Music Archive" / "Cars Archive" right
      // beneath the category badge on each card — looked like the category was duplicated.
      ? "YouTube"
      : "VideoRec";

  return {
    id: video.videoId,
    title: video.title,
    creator: creatorSeed,
    channel,
    views: formatViews(video.viewCount),
    viewCount: video.viewCount ?? 0,
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
    likeCount: video.likeCount ?? 0,
    dislikeCount: video.dislikeCount ?? 0,
    uploaderId: video.uploaderId,
  };
}

export function fromYouTubeVideo(video: YouTubeVideo): UiVideo {
  const category = formatVideoCategoryLabel(video.localCategoryId || video.tags?.[0] || "YouTube");
  const durationSeconds = video.durationSeconds || 0;

  return {
    id: video.youtubeId,
    title: video.title,
    creator: "YouTube",
    channel: "YouTube",
    views: "YouTube",
    viewCount: 0,
    uploadedAt: "Live",
    duration: formatDuration(durationSeconds),
    durationSeconds,
    category,
    score: "YouTube",
    poster: "youtube",
    thumbnailUrl: upgradeThumb(video.thumbnailUrl, video.youtubeId),
    source: "youtube",
    youtubeId: video.youtubeId,
    description: video.description || "YouTube video.",
    likeCount: 0,
    dislikeCount: 0,
  };
}
