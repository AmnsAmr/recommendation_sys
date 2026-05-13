import { buildQuery, getJson, postJson, putFormData } from "@/lib/api";
import type { ApiVideo } from "@/lib/video-types";

export type InitUploadResponse = {
  videoId: string;
  uploadToken: string;
  expiresAt: string;
};

export type UploadVideoResponse = {
  videoId: string;
  status: "UNDER_REVIEW";
  thumbnailUrl: string;
  url: string;
  uploadedAt: string;
};

type PaginatedVideosResponse = {
  videos: ApiVideo[];
  page: number;
  size: number;
  totalElements: number;
};

type AcknowledgedResponse = {
  acknowledged: boolean;
};

type VideoReactionResponse = {
  videoId: string;
  action: "like" | "dislike";
  likeCount: number;
  dislikeCount: number;
  recordedAt: string;
};

export function getVideo(videoId: string) {
  return getJson<ApiVideo>(`/videos/${videoId}`);
}

export function getVideosByUser(userId: string) {
  return getJson<PaginatedVideosResponse>(`/videos/user/${userId}`, { auth: true });
}

export function initVideoUpload(payload: {
  title: string;
  description?: string;
  categoryId: string;
  tags?: string[];
  language?: string;
}) {
  return postJson<InitUploadResponse, typeof payload>("/videos/init", payload, { auth: true });
}

export function uploadVideoFile(videoId: string, uploadToken: string, file: File) {
  const formData = new FormData();
  formData.set("file", file);

  return putFormData<UploadVideoResponse>(`/videos/${videoId}/upload`, formData, {
    auth: true,
    headers: {
      "X-Upload-Token": uploadToken,
    },
  });
}

export function searchPublicVideos(params: { query?: string; categoryId?: string; limit?: number }) {
  return getJson<PaginatedVideosResponse>(
    `/videos/search${buildQuery({
      q: params.query,
      page: 0,
      size: params.limit,
    })}`,
  );
}

export function getVideoCatalog(params: { categoryId?: string; source?: string; language?: string; page?: number; size?: number }) {
  return getJson<PaginatedVideosResponse>(`/videos/catalog${buildQuery(params)}`);
}

export function recordWatchEvent(payload: {
  videoId: string;
  watchDuration: number;
  videoDuration: number;
  completionPct: number;
  source: "own" | "youtube";
}) {
  return postJson<AcknowledgedResponse, typeof payload>("/videos/watch", payload, { auth: true });
}

export function reactToVideo(videoId: string, action: "like" | "dislike") {
  return postJson<VideoReactionResponse, { action: "like" | "dislike" }>(`/videos/${videoId}/like`, { action }, { auth: true });
}
