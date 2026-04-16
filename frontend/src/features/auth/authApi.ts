import { apiFetchJson } from "../shared/httpClient";

import { STORAGE_KEYS } from "../../lib/constants";

const TOKEN_KEY = STORAGE_KEYS.ADMIN_TOKEN;

export interface ApiError extends Error {
  status?: number;
  data?: Record<string, unknown> | null;
}

function toApiError(message: string, status?: number, data?: unknown): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  err.data = data as Record<string, unknown> | null | undefined;
  return err;
}

export function getToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

interface LoginResponse {
  token: string;
  user?: {
    id: string;
    username: string;
  };
}

interface UserInfo {
  id: string;
  username: string;
  role?: string;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetchJson<T>({
    path,
    options,
    token: getToken(),
    toError: (status, data) => toApiError(String(data?.error) || "request_failed", status, data),
  });
}

export async function login(params: { username: string; password: string }): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: params.username,
      password: params.password,
    }),
  });

  if (!data?.token) throw toApiError("missing_token");
  setToken(data.token);
  return data;
}

export async function me(): Promise<UserInfo> {
  return apiFetch<UserInfo>("/api/auth/me", { method: "GET" });
}
