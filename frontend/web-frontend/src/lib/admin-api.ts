import { deleteJson, getJson, postJson, putJson } from "@/lib/api";

export type AdminUsersDashboardResponse = {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  adminUsers: number;
  newUsersLast7Days: number;
  latestUsers: Array<{
    userId: string;
    username: string;
    displayName: string;
    role: "USER" | "ADMIN";
    isActive: boolean;
    createdAt: string;
  }>;
};

export type AdminUsersListResponse = {
  users: Array<{
    userId: string;
    email: string;
    username: string;
    displayName: string;
    role: "USER" | "ADMIN";
    isActive: boolean;
    bannedAt: string | null;
    createdAt: string;
  }>;
  page: number;
  size: number;
  totalElements: number;
};

export type AdminUserDetailsResponse = {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  profilePictureUrl: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
  banReason: string | null;
  bannedAt: string | null;
  preferences: Array<{ category: string; weight: number }>;
  createdAt: string;
  updatedAt: string;
};

export type AdminVideosDashboardResponse = {
  totalVideos: number;
  publicVideos: number;
  pendingReviewVideos: number;
  rejectedVideos: number;
  youtubeVideos: number;
  platformVideos: number;
  uploadsLast7Days: number;
  totalViews: number;
};

export type AdminPendingVideosResponse = {
  videos: Array<{
    videoId: string;
    title: string;
    uploaderId: string;
    status: "UNDER_REVIEW" | "READY" | "REJECTED";
    thumbnailUrl: string | null;
    createdAt: string;
  }>;
  page: number;
  size: number;
  totalElements: number;
};

export type AdminVideoDetailsResponse = {
  videoId: string;
  title: string;
  description: string | null;
  categoryId: string;
  status: "UNDER_REVIEW" | "READY" | "REJECTED";
  uploaderId: string;
  thumbnailUrl: string | null;
  moderationNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
};

export function getAdminUsersDashboard() {
  return getJson<AdminUsersDashboardResponse>("/admin/users/dashboard", { auth: true });
}

export function listAdminUsers(params: { page?: number; size?: number; active?: boolean; role?: "USER" | "ADMIN" }) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size !== undefined) query.set("size", String(params.size));
  if (params.active !== undefined) query.set("active", String(params.active));
  if (params.role) query.set("role", params.role);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return getJson<AdminUsersListResponse>(`/admin/users${suffix}`, { auth: true });
}

export function getAdminUser(userId: string) {
  return getJson<AdminUserDetailsResponse>(`/admin/users/${userId}`, { auth: true });
}

export function updateAdminUser(
  userId: string,
  payload: { displayName?: string; bio?: string; profilePictureUrl?: string; role?: "USER" | "ADMIN" },
) {
  return putJson<AdminUserDetailsResponse, typeof payload>(`/admin/users/${userId}`, payload, { auth: true });
}

export function banAdminUser(userId: string, reason: string) {
  return putJson<{ acknowledged?: boolean }, { reason: string }>(`/admin/users/${userId}/ban`, { reason }, { auth: true });
}

export function unbanAdminUser(userId: string) {
  return putJson<{ acknowledged?: boolean }, Record<string, never>>(`/admin/users/${userId}/unban`, {}, { auth: true });
}

export function deleteAdminUser(userId: string) {
  return deleteJson<null>(`/admin/users/${userId}`, { auth: true });
}

export function getAdminVideosDashboard() {
  return getJson<AdminVideosDashboardResponse>("/admin/videos/dashboard", { auth: true });
}

export function listPendingAdminVideos() {
  return getJson<AdminPendingVideosResponse>("/admin/videos/pending", { auth: true });
}

export function getAdminVideo(videoId: string) {
  return getJson<AdminVideoDetailsResponse>(`/admin/videos/${videoId}`, { auth: true });
}

export function updateAdminVideo(
  videoId: string,
  payload: { title?: string; description?: string; categoryId?: string; language?: string },
) {
  return putJson<AdminVideoDetailsResponse, typeof payload>(`/admin/videos/${videoId}`, payload, { auth: true });
}

export function approveAdminVideo(videoId: string, notes: string) {
  return postJson<{ acknowledged?: boolean }, { notes: string }>(`/admin/videos/${videoId}/approve`, { notes }, { auth: true });
}

export function rejectAdminVideo(videoId: string, notes: string) {
  return postJson<{ acknowledged?: boolean }, { notes: string }>(`/admin/videos/${videoId}/reject`, { notes }, { auth: true });
}

export function deleteAdminVideo(videoId: string) {
  return deleteJson<null>(`/admin/videos/${videoId}`, { auth: true });
}
