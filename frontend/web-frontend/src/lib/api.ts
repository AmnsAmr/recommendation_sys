import type {
  AdminDashboardResponse,
  AdminUserListResponse,
  AdminVideoDashboardResponse,
  AdminVideoListResponse,
  ApiVideo,
  AuthResponse,
  ColdStartRecommendationsResponse,
  RecommendationResponse,
  SimilarVideosResponse,
  UserProfile,
  VideoListResponse,
  VideoUploadInitResponse,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const TOKEN_KEY = "auth_token";

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  window.localStorage.removeItem(TOKEN_KEY);
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
    try {
      const payload = await response.json();
      message = payload?.error?.message || payload?.message || message;
    } catch {
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

  getProfile(userId: string) {
    return apiRequest<UserProfile>(`/users/${userId}/profile`);
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

  searchVideos(query: string) {
    const search = new URLSearchParams({ q: query, page: "0", size: "24" });
    return apiRequest<VideoListResponse>(`/videos/search?${search.toString()}`, { auth: false });
  },

  getVideo(videoId: string) {
    return apiRequest<ApiVideo>(`/videos/${encodeURIComponent(videoId)}`, { auth: false });
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
    return apiRequest("/videos/watch", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  likeVideo(videoId: string, action: "like" | "dislike") {
    return apiRequest(`/videos/${encodeURIComponent(videoId)}/like`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
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
  getPersonalizedRecommendations(userId: string) {
    return apiRequest<RecommendationResponse>(`/recommendations/${userId}`);
  },

  getColdStartRecommendations(categoryId: string) {
    return apiRequest<ColdStartRecommendationsResponse>(`/recommendations/cold/${categoryId}`);
  },

  getSimilarVideos(videoId: string) {
    return apiRequest<SimilarVideosResponse>(`/recommendations/similar/${videoId}`);
  },
};
