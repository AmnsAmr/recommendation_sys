import type { UiVideo } from "@/lib/video-mapper";

const fallbackYouTube = [
  {
    youtubeId: "dQw4w9WgXcQ",
    title: "Rick Astley - Never Gonna Give You Up",
    category: "Music",
    durationSeconds: 213,
  },
  {
    youtubeId: "ysz5S6PUM-U",
    title: "Big Buck Bunny",
    category: "Education",
    durationSeconds: 596,
  },
  {
    youtubeId: "aqz-KE-bpKQ",
    title: "Big Buck Bunny 60fps",
    category: "Video",
    durationSeconds: 596,
  },
  {
    youtubeId: "ScMzIvxBSi4",
    title: "Sample YouTube Video",
    category: "Travel",
    durationSeconds: 30,
  },
];

export function getFallbackYouTubeVideos(): UiVideo[] {
  return fallbackYouTube.map((video) => ({
    id: video.youtubeId,
    title: video.title,
    creator: "YouTube",
    channel: "YouTube",
    views: "YouTube",
    uploadedAt: "Demo",
    duration: formatDuration(video.durationSeconds),
    durationSeconds: video.durationSeconds,
    category: video.category,
    score: "YouTube",
    poster: "youtube",
    thumbnailUrl: `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`,
    source: "youtube",
    youtubeId: video.youtubeId,
    description: "Real YouTube video embedded in the player.",
  }));
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
