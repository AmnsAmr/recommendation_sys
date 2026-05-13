"use client";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const AUTH_STORAGE_KEY = "videorec-auth-session";

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown[];
  };
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown[];

  constructor(status: number, message: string, code?: string, details?: unknown[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit | null;
  headers?: HeadersInit;
  auth?: boolean;
};

type StoredSession = {
  token?: string;
};

function getStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function buildHeaders(options: RequestOptions) {
  const headers = new Headers(options.headers);

  if (options.auth) {
    const token = getStoredSession()?.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return headers;
}

async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: buildHeaders(options),
    body: options.body,
  });

  const payload = (await response.json().catch(() => null)) as TResponse | ApiErrorPayload | null;

  if (!response.ok) {
    const apiError = payload as ApiErrorPayload | null;
    throw new ApiError(
      response.status,
      apiError?.error?.message || "Request failed. Please try again.",
      apiError?.error?.code,
      apiError?.error?.details,
    );
  }

  return payload as TResponse;
}

export function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function getJson<TResponse>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) {
  return request<TResponse>(path, { ...options, method: "GET" });
}

export function postJson<TResponse, TBody>(path: string, body: TBody, options: Omit<RequestOptions, "method" | "body"> = {}) {
  return request<TResponse>(path, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(body),
  });
}

export function putJson<TResponse, TBody>(path: string, body: TBody, options: Omit<RequestOptions, "method" | "body"> = {}) {
  return request<TResponse>(path, {
    ...options,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(body),
  });
}

export function putFormData<TResponse>(path: string, formData: FormData, options: Omit<RequestOptions, "method" | "body"> = {}) {
  return request<TResponse>(path, {
    ...options,
    method: "PUT",
    body: formData,
  });
}

export function deleteJson<TResponse>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) {
  return request<TResponse>(path, {
    ...options,
    method: "DELETE",
  });
}
