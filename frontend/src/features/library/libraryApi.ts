import { clearToken, getToken } from "../auth/authApi";
import type {
  LibraryAssetOpenInfo,
  LibraryCatalogResponse,
  LibraryFolder,
  LibraryFolderAssetsResponse,
  LibraryOpenMode,
} from "./types";

interface LibraryApiError extends Error {
  status: number;
  code: string;
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

function toApiError(status: number, data: any): LibraryApiError {
  const code = typeof data?.error === "string" ? data.error : "request_failed";
  const err = new Error(code) as LibraryApiError;
  err.status = status;
  err.code = code;
  err.data = data;
  return err;
}

async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
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

  if (response.ok) return data as T;
  throw toApiError(response.status, data);
}

function toFolder(value: any): LibraryFolder {
  return {
    id: String(value?.id || ""),
    name: String(value?.name || ""),
    categoryId: String(value?.categoryId || "other"),
    coverType: value?.coverType === "image" ? "image" : "blank",
    coverPath: String(value?.coverPath || ""),
    parentId: value?.parentId ?? null,
    order: Number(value?.order || 0),
    assetCount: Number(value?.assetCount || 0),
    createdAt: String(value?.createdAt || ""),
    updatedAt: String(value?.updatedAt || ""),
  };
}

function toAsset(value: any) {
  return {
    id: String(value?.id || ""),
    folderId: String(value?.folderId || ""),
    adapterKey: String(value?.adapterKey || ""),
    fileName: String(value?.fileName || ""),
    filePath: String(value?.filePath || ""),
    fileSize: Number(value?.fileSize || 0),
    openMode: value?.openMode === "embed" ? "embed" : "download",
    generatedEntryPath: String(value?.generatedEntryPath || ""),
    status: value?.status === "failed" ? "failed" : "ready",
    createdAt: String(value?.createdAt || ""),
    updatedAt: String(value?.updatedAt || ""),
  } as const;
}

export async function listLibraryCatalog(): Promise<LibraryCatalogResponse> {
  const data = await apiFetch<any>("/api/library/catalog", { method: "GET" });
  const folders = Array.isArray(data?.folders) ? data.folders.map(toFolder) : [];
  return { folders };
}

export async function listLibraryFolders(): Promise<LibraryFolder[]> {
  const data = await apiFetch<any>("/api/library/folders", { method: "GET" });
  const folders = Array.isArray(data?.folders) ? data.folders.map(toFolder) : [];
  return folders;
}

export async function getLibraryFolder(folderId: string): Promise<LibraryFolder> {
  const data = await apiFetch<any>(`/api/library/folders/${encodeURIComponent(folderId)}`, { method: "GET" });
  return toFolder(data?.folder || {});
}

export async function listLibraryFolderAssets(folderId: string): Promise<LibraryFolderAssetsResponse> {
  const data = await apiFetch<any>(`/api/library/folders/${encodeURIComponent(folderId)}/assets`, {
    method: "GET",
  });
  const assets = Array.isArray(data?.assets) ? data.assets.map(toAsset) : [];
  return { assets };
}

export async function getLibraryAssetOpenInfo(assetId: string): Promise<LibraryAssetOpenInfo> {
  const data = await apiFetch<any>(`/api/library/assets/${encodeURIComponent(assetId)}`, {
    method: "GET",
  });
  return {
    ok: data?.ok === true,
    mode: data?.mode === "embed" ? "embed" : "download",
    openUrl: String(data?.openUrl || ""),
    downloadUrl: String(data?.downloadUrl || ""),
    asset: toAsset(data?.asset || {}),
  };
}

export async function createLibraryFolder(payload: {
  name: string;
  categoryId: string;
  coverType?: "blank" | "image";
}): Promise<any> {
  return apiFetch("/api/library/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      categoryId: payload.categoryId || "other",
      coverType: payload.coverType || "blank",
    }),
  });
}

export async function uploadLibraryFolderCover(payload: {
  folderId: string;
  file: File;
}): Promise<any> {
  const formData = new FormData();
  formData.append("file", payload.file);

  return apiFetch(`/api/library/folders/${encodeURIComponent(payload.folderId)}/cover`, {
    method: "POST",
    body: formData,
  });
}

export async function uploadLibraryAsset(payload: {
  folderId: string;
  file: File;
  openMode: LibraryOpenMode;
}): Promise<any> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("openMode", payload.openMode || "embed");

  return apiFetch(`/api/library/folders/${encodeURIComponent(payload.folderId)}/assets`, {
    method: "POST",
    body: formData,
  });
}

export async function deleteLibraryFolder(folderId: string): Promise<any> {
  return apiFetch(`/api/library/folders/${encodeURIComponent(folderId)}`, {
    method: "DELETE",
  });
}

export async function deleteLibraryAsset(assetId: string): Promise<any> {
  return apiFetch(`/api/library/assets/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
  });
}
