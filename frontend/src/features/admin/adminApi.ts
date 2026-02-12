import { clearToken, getToken } from "../auth/authApi";

interface ApiError extends Error {
  status?: number;
  data?: any;
}

function withAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  if (!token) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(path, {
    ...options,
    headers: withAuthHeaders({
      Accept: "application/json",
      ...(options.headers as Record<string, string> | undefined),
    }),
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pa-auth-expired"));
    }
  }

  if (response.ok) return data;

  const err = new Error(data?.error || "request_failed") as ApiError;
  err.status = response.status;
  err.data = data;
  throw err;
}

export interface AdminListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  type?: string;
}

export async function listAdminItems(params: AdminListParams = {}): Promise<any> {
  const query = new URLSearchParams();
  query.set("page", String(params.page || 1));
  query.set("pageSize", String(params.pageSize || 24));
  if (params.q) query.set("q", params.q);
  if (params.type) query.set("type", params.type);

  return apiFetch(`/api/items?${query.toString()}`, { method: "GET" });
}

export async function listTaxonomy(): Promise<any> {
  return apiFetch("/api/categories", { method: "GET" });
}

export async function createLinkItem(payload: {
  url: string;
  categoryId: string;
  title: string;
  description: string;
}): Promise<any> {
  return apiFetch("/api/items/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function uploadHtmlItem(payload: {
  file: File;
  categoryId: string;
  title: string;
  description: string;
}): Promise<any> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("categoryId", payload.categoryId || "other");
  formData.append("title", payload.title || "");
  formData.append("description", payload.description || "");

  return apiFetch("/api/items/upload", {
    method: "POST",
    body: formData,
  });
}

export async function updateAdminItem(id: string, patch: Record<string, unknown>): Promise<any> {
  return apiFetch(`/api/items/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch || {}),
  });
}

export async function deleteAdminItem(id: string): Promise<any> {
  return apiFetch(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function restoreBuiltinItem(id: string): Promise<any> {
  return apiFetch(`/api/items/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deleted: false }),
  });
}

export async function createGroup(payload: {
  id: string;
  title: string;
  order?: number;
  hidden?: boolean;
}): Promise<any> {
  return apiFetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: payload.id,
      title: payload.title,
      order: payload.order ?? 0,
      hidden: payload.hidden === true,
    }),
  });
}

export async function updateGroup(id: string, patch: Record<string, unknown>): Promise<any> {
  return apiFetch(`/api/groups/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch || {}),
  });
}

export async function deleteGroup(id: string): Promise<any> {
  return apiFetch(`/api/groups/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function createCategory(payload: {
  id: string;
  groupId: string;
  title: string;
  order?: number;
  hidden?: boolean;
}): Promise<any> {
  return apiFetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: payload.id,
      groupId: payload.groupId,
      title: payload.title,
      order: payload.order ?? 0,
      hidden: payload.hidden === true,
    }),
  });
}

export async function updateCategory(id: string, patch: Record<string, unknown>): Promise<any> {
  return apiFetch(`/api/categories/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch || {}),
  });
}

export async function deleteCategory(id: string): Promise<any> {
  return apiFetch(`/api/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getSystemInfo(): Promise<any> {
  return apiFetch("/api/system", { method: "GET" });
}

export async function updateSystemStorage(payload: {
  mode?: string;
  webdav?: Record<string, unknown>;
  sync?: boolean;
}): Promise<any> {
  return apiFetch("/api/system/storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: payload.mode,
      webdav: payload.webdav || {},
      sync: payload.sync === true,
    }),
  });
}

export async function updateAccount(payload: {
  currentPassword: string;
  newUsername?: string;
  newPassword?: string;
}): Promise<any> {
  return apiFetch("/api/auth/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      currentPassword: payload.currentPassword,
      newUsername: payload.newUsername,
      newPassword: payload.newPassword,
    }),
  });
}

export interface DashboardStats {
  dynamicTotal: number;
  uploadTotal: number;
  linkTotal: number;
  builtinTotal: number;
  categoryTotal: number;
  total: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [all, uploads, links, taxonomy] = await Promise.all([
    listAdminItems({ page: 1, pageSize: 1 }),
    listAdminItems({ page: 1, pageSize: 1, type: "upload" }),
    listAdminItems({ page: 1, pageSize: 1, type: "link" }),
    listTaxonomy(),
  ]);

  const categories = Array.isArray(taxonomy?.categories) ? taxonomy.categories : [];
  const builtinTotal = categories.reduce((sum: number, category: any) => {
    const count = Number(category?.builtinCount || 0);
    return sum + (Number.isFinite(count) ? count : 0);
  }, 0);

  const dynamicTotal = Number(all?.total || 0);
  const uploadTotal = Number(uploads?.total || 0);
  const linkTotal = Number(links?.total || 0);
  const categoryTotal = categories.length;

  return {
    dynamicTotal,
    uploadTotal,
    linkTotal,
    builtinTotal,
    categoryTotal,
    total: dynamicTotal + builtinTotal,
  };
}
