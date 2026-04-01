import type { AdminApiError, AdminItemsResponse } from "./adminTypes";

function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

export function parseAdminItemsResponse(raw: any): AdminItemsResponse {
  const items = Array.isArray(raw?.items) ? raw.items : [];

  return {
    page: toInt(raw?.page, 1),
    pageSize: toInt(raw?.pageSize, 24),
    total: toInt(raw?.total, 0),
    items,
  };
}

export function toApiError(status: number, data: any): AdminApiError {
  const code = typeof data?.error === "string" ? data.error : "request_failed";
  const err = new Error(code) as AdminApiError;
  err.status = status;
  err.code = code;
  err.data = data;
  if (data?.details !== undefined) err.details = data.details;
  return err;
}

