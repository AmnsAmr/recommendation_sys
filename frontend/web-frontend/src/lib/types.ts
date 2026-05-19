export type AuthUser = {
  userId: string;
  email?: string;
  role: string;
  username: string;
  displayName?: string;
};

export type AuthResponse = {
  token: string;
  userId: string;
  username: string;
  displayName: string;
  role: string;
  expiresIn: number;
};

export type ApiVideo = {
  videoId: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
  thumbnailUrl?: string;
  source?: "own" | "youtube" | string;
  youtubeId?: string;
  url?: string;
  duration?: number;
  viewCount?: number;
  likeCount?: number;
  dislikeCount?: number;
  language?: string;
  uploaderId?: string;
  status?: string;
  createdAt?: string;
};

export type VideoListResponse = {
  videos: ApiVideo[];
  page: number;
  size: number;
  totalElements: number;
};

export type VideoUploadInitResponse = {
  videoId: string;
  uploadToken: string;
  status: string;
};

export type AdminUser = {
  userId: string;
  email: string;
  username: string;
  displayName?: string;
  role: string;
  isActive: boolean;
  bannedAt?: string | null;
  createdAt?: string;
};

export type AdminUserListResponse = {
  users: AdminUser[];
  page: number;
  size: number;
  totalElements: number;
};

export type AdminDashboardResponse = {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  adminUsers: number;
  newUsersLast7Days: number;
};

export type AdminVideo = {
  videoId: string;
  title: string;
  uploaderId?: string;
  status: string;
  thumbnailUrl?: string;
  createdAt?: string;
};

export type AdminVideoListResponse = {
  videos: AdminVideo[];
  page: number;
  size: number;
  totalElements: number;
};

export type AdminVideoDashboardResponse = {
  totalVideos: number;
  publicVideos: number;
  pendingReviewVideos: number;
  rejectedVideos: number;
  youtubeVideos: number;
  platformVideos: number;
  uploadsLast7Days: number;
  totalViews: number;
};
