import { postJson } from "@/lib/api";

export type AuthResponse = {
  token: string;
  userId: string;
  username: string;
  displayName: string;
  role: "USER" | "ADMIN";
  expiresIn: number;
};

export function loginUser(payload: { email: string; password: string }) {
  return postJson<AuthResponse, typeof payload>("/users/login", payload);
}

export function registerUser(payload: {
  email: string;
  password: string;
  username: string;
  displayName: string;
  interests: string[];
}) {
  return postJson<AuthResponse, typeof payload>("/users/register", payload);
}
