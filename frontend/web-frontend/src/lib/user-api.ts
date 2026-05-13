import { getJson, putJson } from "@/lib/api";

export type UserPreference = {
  category: string;
  weight: number;
};

export type UserProfileResponse = {
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  profilePictureUrl: string | null;
  email: string;
  role: "USER" | "ADMIN";
  preferences: UserPreference[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProfileResponse = {
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  profilePictureUrl: string | null;
  role: "USER" | "ADMIN";
  updatedAt: string;
};

export type UpdatePreferencesResponse = {
  userId: string;
  username: string;
  displayName: string;
  role: "USER" | "ADMIN";
  preferences: UserPreference[];
  updatedAt: string;
};

export function getUserProfile(userId: string) {
  return getJson<UserProfileResponse>(`/users/${userId}/profile`, { auth: true });
}

export function updateUserProfile(
  userId: string,
  payload: { displayName?: string; bio?: string; profilePictureUrl?: string },
) {
  return putJson<UpdateProfileResponse, typeof payload>(`/users/${userId}/profile`, payload, { auth: true });
}

export function updateUserPreferences(userId: string, preferences: UserPreference[]) {
  return putJson<UpdatePreferencesResponse, { preferences: UserPreference[] }>(
    `/users/${userId}/preferences`,
    { preferences },
    { auth: true },
  );
}
