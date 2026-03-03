import { apiFetchJson } from "../shared/httpClient";

const TOKEN_KEY = "pa_admin_token";

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

function toApiError(message: string, status?: number, data?: unknown): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  err.data = data;
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

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  return apiFetchJson({
    path,
    options,
    token: getToken(),
    toError: (status, data) => toApiError(data?.error || "request_failed", status, data),
  });
}

export async function login(params: { username: string; password: string }): Promise<any> {
  const data = await apiFetch("/api/auth/login", {
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

export async function me(): Promise<any> {
  return apiFetch("/api/auth/me", { method: "GET" });
}
