import { buildQuery, getJson } from "@/lib/api";

export type PersonalizedRecommendationsResponse = {
  userId: string;
  strategy: "hybrid" | "cold_start";
  videoIds: string[];
  cachedAt: string | null;
  generatedAt: string;
};

export type SimilarVideosResponse = {
  videoId: string;
  similarVideoIds: string[];
  generatedAt: string;
};

export type ColdStartRecommendationsResponse = {
  categoryId: string;
  videoIds: string[];
  generatedAt: string;
};

export function getPersonalizedRecommendations(userId: string, limit = 20) {
  return getJson<PersonalizedRecommendationsResponse>(`/recommendations/${userId}${buildQuery({ limit })}`, {
    auth: true,
  });
}

export function getSimilarVideos(videoId: string, limit = 10) {
  return getJson<SimilarVideosResponse>(`/recommendations/similar/${videoId}${buildQuery({ limit })}`);
}

export function getColdStartRecommendations(categoryId: string, limit = 20) {
  return getJson<ColdStartRecommendationsResponse>(`/recommendations/cold/${categoryId}${buildQuery({ limit })}`);
}
