function toHeaderRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    const out: Record<string, string> = {};
    for (const [key, value] of headers) {
      out[key] = value;
    }
    return out;
  }
  return Object.fromEntries(
    Object.entries(headers as Record<string, string | number | boolean>)
      .filter(([, v]) => typeof v === "string")
  ) as Record<string, string>;
}

function buildHeaders(headers?: HeadersInit, token = ""): Record<string, string> {
  const merged = {
    Accept: "application/json",
    ...toHeaderRecord(headers),
  };
  if (!token) return merged;
  return {
    ...merged,
    Authorization: `Bearer ${token}`,
  };
}

export interface ApiErrorData {
  error?: string;
  [key: string]: unknown;
}

export type ApiErrorHandler = (status: number, data: ApiErrorData | null) => Error;

export async function apiFetchJson<T>(params: {
  path: string;
  options?: RequestInit;
  token?: string;
  onUnauthorized?: () => void;
  toError?: ApiErrorHandler;
}): Promise<T> {
  const { path, options = {}, token = "", onUnauthorized, toError } = params;
  const response = await fetch(path, {
    ...options,
    headers: buildHeaders(options.headers, token),
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (response.status === 401) {
    onUnauthorized?.();
  }

  if (response.ok) return data as unknown as T;

  if (typeof toError === "function") {
    throw toError(response.status, data);
  }

  const fallback = Object.assign(
    new Error(typeof data?.error === "string" ? data.error : "request_failed"),
    { status: response.status, data: data as ApiErrorData | null }
  );
  throw fallback;
}

