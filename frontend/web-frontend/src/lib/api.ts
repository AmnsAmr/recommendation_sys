import type {
  AdminDashboardResponse,
  AdminUserDetail,
  AdminUserListResponse,
  AdminVideoDashboardResponse,
  AdminVideoDetail,
  AdminVideoListResponse,
  ApiVideo,
  AuthResponse,
  ColdStartRecommendationsResponse,
  LikeActionResponse,
  PublicProfile,
  RecommendationResponse,
  SimilarVideosResponse,
  UserProfile,
  VideoListResponse,
  VideoUploadInitResponse,
  WatchAckResponse,
  YouTubeSearchResponse,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const TOKEN_KEY = "auth_token";
const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
const TEST_TOKEN = "test-mode-token";
const PROFILE_TTL_MS = 10 * 60 * 1000;
const VIDEO_TTL_MS = 5 * 60 * 1000;
const RECOMMENDATION_TTL_MS = 2 * 60 * 1000;
const COLD_START_TTL_MS = 10 * 60 * 1000;
const SIMILAR_VIDEOS_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

type RequestOptions = RequestInit & {
  auth?: boolean;
};

type CacheableRequestOptions = {
  force?: boolean;
};

const responseCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) {
    return token;
  }

  return AUTH_DISABLED ? TEST_TOKEN : null;
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

function readCachedValue<T>(key: string) {
  const entry = responseCache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }

  return entry.value as T;
}

function writeCachedValue<T>(key: string, value: T, ttlMs: number) {
  responseCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function invalidateCachedValue(key: string) {
  responseCache.delete(key);
}

function cachedRequest<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  options: CacheableRequestOptions = {},
) {
  if (!options.force) {
    const cached = readCachedValue<T>(key);
    if (cached !== null) {
      return Promise.resolve(cached);
    }

    const pending = pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }
  }

  const request = fetcher()
    .then((value) => {
      writeCachedValue(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, request);
  return request;
}

function getStoredUserId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("user");
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { userId?: string };
    return parsed.userId || null;
  } catch {
    return null;
  }
}

function invalidateRecommendationCaches(userId = getStoredUserId()) {
  if (!userId) {
    return;
  }

  invalidateCachedValue(`recommendations:${userId}`);
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false) {
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    const contentType = response.headers.get("Content-Type") ?? "";
    try {
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(text || message);
      }

      const payload = await response.json();
      message = payload?.error?.message || payload?.message || message;
    } catch (error) {
      if (error instanceof Error && error.message) {
        message = error.message;
      }
      // Keep the HTTP status message when the backend returns no JSON body.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return apiRequest<AuthResponse>("/users/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    });
  },

  register(payload: {
    email: string;
    password: string;
    username: string;
    displayName: string;
    interests: string[];
  }) {
    return apiRequest<AuthResponse>("/users/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload),
    });
  },

  getProfile(userId: string, options: CacheableRequestOptions = {}) {
    return cachedRequest(
      `profile:${userId}`,
      PROFILE_TTL_MS,
      () => apiRequest<UserProfile>(`/users/${userId}/profile`),
      options,
    );
  },

  // Public creator info for rendering a video's channel name/avatar. Unlike
  // getProfile (owner-only), this works for any uploader and any viewer.
  getPublicProfile(userId: string, options: CacheableRequestOptions = {}) {
    return cachedRequest(
      `public-profile:${userId}`,
      PROFILE_TTL_MS,
      () => apiRequest<PublicProfile>(`/users/${userId}/public-profile`, { auth: false }),
      options,
    );
  },

  getCatalog(params: { categoryId?: string; page?: number; size?: number } = {}) {
    const search = new URLSearchParams();
    if (params.categoryId) {
      search.set("categoryId", params.categoryId);
    }
    search.set("page", String(params.page ?? 0));
    search.set("size", String(params.size ?? 24));

    return apiRequest<VideoListResponse>(`/videos/catalog?${search.toString()}`, { auth: false });
  },

  searchVideos(query: string, params: { page?: number; size?: number } = {}) {
    const search = new URLSearchParams({
      q: query,
      page: String(params.page ?? 0),
      size: String(params.size ?? 24),
    });
    return apiRequest<VideoListResponse>(`/videos/search?${search.toString()}`, { auth: false });
  },

  searchYouTubeVideos(query: string, maxResults = 12) {
    const search = new URLSearchParams({ q: query, maxResults: String(maxResults) });
    return apiRequest<YouTubeSearchResponse>(`/videos/youtube/search?${search.toString()}`, { auth: false });
  },

  getVideo(videoId: string, options: CacheableRequestOptions = {}) {
    return cachedRequest(
      `video:${videoId}`,
      VIDEO_TTL_MS,
      () => apiRequest<ApiVideo>(`/videos/${encodeURIComponent(videoId)}`, { auth: false }),
      options,
    );
  },

  getUserVideos(userId: string) {
    return apiRequest<VideoListResponse>(`/videos/user/${encodeURIComponent(userId)}?page=0&size=12`, { auth: false });
  },

  recordWatch(payload: {
    videoId: string;
    watchDuration: number;
    videoDuration: number;
    completionPct: number;
    source: string;
  }) {
    return apiRequest<WatchAckResponse>("/videos/watch", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((response) => {
      invalidateCachedValue(`video:${payload.videoId}`);
      invalidateRecommendationCaches();
      return response;
    });
  },

  likeVideo(videoId: string, action: "like" | "dislike") {
    return apiRequest<LikeActionResponse>(`/videos/${encodeURIComponent(videoId)}/like`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }).then((response) => {
      invalidateCachedValue(`video:${videoId}`);
      invalidateRecommendationCaches();
      return response;
    });
  },

  getVideoReaction(videoId: string) {
    return apiRequest<LikeActionResponse>(`/videos/${encodeURIComponent(videoId)}/like`);
  },

  initUpload(payload: {
    title: string;
    description: string;
    categoryId: string;
    tags: string[];
    language: string;
  }) {
    return apiRequest<VideoUploadInitResponse>("/videos/init", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  uploadVideoFile(videoId: string, uploadToken: string, file: File) {
    const formData = new FormData();
    formData.set("file", file);

    return apiRequest(`/videos/${encodeURIComponent(videoId)}/upload`, {
      method: "PUT",
      headers: { "X-Upload-Token": uploadToken },
      body: formData,
    });
  },

  getAdminUserDashboard() {
    return apiRequest<AdminDashboardResponse>("/admin/users/dashboard");
  },

  getAdminUsers() {
    return apiRequest<AdminUserListResponse>("/admin/users?page=0&size=50");
  },

  getAdminUser(userId: string) {
    return apiRequest<AdminUserDetail>(`/admin/users/${encodeURIComponent(userId)}`);
  },

  updateAdminUser(userId: string, payload: { role?: string }) {
    return apiRequest(`/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  banUser(userId: string, reason: string) {
    return apiRequest(`/admin/users/${userId}/ban`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  },

  unbanUser(userId: string) {
    return apiRequest(`/admin/users/${userId}/unban`, { method: "PUT" });
  },

  deleteUser(userId: string) {
    return apiRequest<void>(`/admin/users/${userId}`, { method: "DELETE" });
  },

  getAdminVideoDashboard() {
    return apiRequest<AdminVideoDashboardResponse>("/admin/videos/dashboard");
  },

  getPendingVideos() {
    return apiRequest<AdminVideoListResponse>("/admin/videos/pending?page=0&size=50");
  },

  getAdminVideo(videoId: string) {
    return apiRequest<AdminVideoDetail>(`/admin/videos/${encodeURIComponent(videoId)}`);
  },

  approveVideo(videoId: string, notes = "") {
    return apiRequest(`/admin/videos/${videoId}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  rejectVideo(videoId: string, notes = "") {
    return apiRequest(`/admin/videos/${videoId}/reject`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  // -- Recommendations --
  getPersonalizedRecommendations(userId: string, options: CacheableRequestOptions = {}) {
    return cachedRequest(
      `recommendations:${userId}`,
      RECOMMENDATION_TTL_MS,
      () => apiRequest<RecommendationResponse>(`/recommendations/${userId}`),
      options,
    );
  },

  getColdStartRecommendations(categoryId: string, options: CacheableRequestOptions = {}) {
    return cachedRequest(
      `cold-start:${categoryId}`,
      COLD_START_TTL_MS,
      () => apiRequest<ColdStartRecommendationsResponse>(`/recommendations/cold/${categoryId}`),
      options,
    );
  },

  getSimilarVideos(videoId: string, options: CacheableRequestOptions = {}) {
    return cachedRequest(
      `similar:${videoId}`,
      SIMILAR_VIDEOS_TTL_MS,
      () => apiRequest<SimilarVideosResponse>(`/recommendations/similar/${videoId}`),
      options,
    );
  },
};
