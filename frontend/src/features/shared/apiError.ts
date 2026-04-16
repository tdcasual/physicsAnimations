export interface ApiErrorDetail {
  status?: number;
  data?: {
    retryAfterSeconds?: number;
    error?: string;
    reason?: string;
    details?: Record<string, unknown>;
    [key: string]: unknown;
  } | null;
  message?: string;
}

export function isApiErrorLike(err: unknown): err is ApiErrorDetail {
  return (
    typeof err === "object" &&
    err !== null &&
    ("status" in err || "data" in err || "message" in err)
  );
}

export function extractApiError(err: unknown): ApiErrorDetail {
  if (isApiErrorLike(err)) return err;
  return {};
}

export function resolveAuthError(status?: number, fallback = "操作失败。"): string {
  return status === 401 ? "请先登录管理员账号。" : fallback;
}
