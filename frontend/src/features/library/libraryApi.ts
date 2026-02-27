import { clearToken, getToken } from "../auth/authApi";
import type {
  LibraryAssetOpenInfo,
  LibraryCatalogResponse,
  LibraryEmbedProfile,
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
  const deleted = value?.deleted === true;
  return {
    id: String(value?.id || ""),
    folderId: String(value?.folderId || ""),
    adapterKey: String(value?.adapterKey || ""),
    displayName: String(value?.displayName || ""),
    fileName: String(value?.fileName || ""),
    filePath: String(value?.filePath || ""),
    fileSize: Number(value?.fileSize || 0),
    openMode: value?.openMode === "embed" ? "embed" : "download",
    generatedEntryPath: String(value?.generatedEntryPath || ""),
    embedProfileId: String(value?.embedProfileId || ""),
    embedOptions:
      value?.embedOptions && typeof value.embedOptions === "object" && !Array.isArray(value.embedOptions)
        ? value.embedOptions
        : {},
    status: value?.status === "failed" ? "failed" : "ready",
    deleted,
    deletedAt: deleted ? String(value?.deletedAt || "") : "",
    createdAt: String(value?.createdAt || ""),
    updatedAt: String(value?.updatedAt || ""),
  } as const;
}

function toEmbedProfile(value: any): LibraryEmbedProfile {
  return {
    id: String(value?.id || ""),
    name: String(value?.name || ""),
    scriptUrl: String(value?.scriptUrl || ""),
    fallbackScriptUrl: String(value?.fallbackScriptUrl || ""),
    viewerPath: String(value?.viewerPath || ""),
    remoteScriptUrl: String(value?.remoteScriptUrl || value?.scriptUrl || ""),
    remoteViewerPath: String(value?.remoteViewerPath || value?.viewerPath || ""),
    syncMode: String(value?.syncMode || "local_mirror"),
    syncStatus: String(value?.syncStatus || "pending"),
    syncMessage: String(value?.syncMessage || ""),
    lastSyncAt: String(value?.lastSyncAt || ""),
    constructorName: String(value?.constructorName || "ElectricFieldApp"),
    assetUrlOptionKey: String(value?.assetUrlOptionKey || "sceneUrl"),
    matchExtensions: Array.isArray(value?.matchExtensions)
      ? value.matchExtensions.map((item: unknown) => String(item || "").trim()).filter(Boolean)
      : [],
    defaultOptions:
      value?.defaultOptions && typeof value.defaultOptions === "object" && !Array.isArray(value.defaultOptions)
        ? value.defaultOptions
        : {},
    enabled: value?.enabled !== false,
    createdAt: String(value?.createdAt || ""),
    updatedAt: String(value?.updatedAt || ""),
  };
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

export async function listLibraryEmbedProfiles(): Promise<LibraryEmbedProfile[]> {
  const data = await apiFetch<any>("/api/library/embed-profiles", { method: "GET" });
  const profiles = Array.isArray(data?.profiles) ? data.profiles.map(toEmbedProfile) : [];
  return profiles;
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

export async function listLibraryDeletedAssets(folderId?: string): Promise<LibraryFolderAssetsResponse> {
  const params = new URLSearchParams();
  if (folderId) params.set("folderId", String(folderId || "").trim());
  const query = params.toString();
  const path = query ? `/api/library/deleted-assets?${query}` : "/api/library/deleted-assets";
  const data = await apiFetch<any>(path, { method: "GET" });
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

export async function updateLibraryFolder(
  folderId: string,
  patch: Partial<{
    name: string;
    categoryId: string;
  }>,
): Promise<any> {
  const body: Record<string, string> = {};
  if (patch.name !== undefined) body.name = String(patch.name || "").trim();
  if (patch.categoryId !== undefined) body.categoryId = String(patch.categoryId || "").trim();

  return apiFetch(`/api/library/folders/${encodeURIComponent(folderId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
  displayName?: string;
  embedProfileId?: string;
  embedOptionsJson?: string;
}): Promise<any> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("openMode", payload.openMode || "embed");
  formData.append("displayName", String(payload.displayName || "").trim());
  if (payload.embedProfileId) {
    formData.append("embedProfileId", String(payload.embedProfileId || "").trim());
  }
  formData.append("embedOptionsJson", String(payload.embedOptionsJson || "").trim());

  return apiFetch(`/api/library/folders/${encodeURIComponent(payload.folderId)}/assets`, {
    method: "POST",
    body: formData,
  });
}

export async function createLibraryEmbedProfile(payload: {
  name: string;
  scriptUrl: string;
  fallbackScriptUrl?: string;
  viewerPath?: string;
  constructorName?: string;
  assetUrlOptionKey?: string;
  matchExtensions?: string[];
  defaultOptions?: Record<string, unknown>;
  enabled?: boolean;
}): Promise<any> {
  return apiFetch("/api/library/embed-profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: String(payload.name || "").trim(),
      scriptUrl: String(payload.scriptUrl || "").trim(),
      fallbackScriptUrl: String(payload.fallbackScriptUrl || "").trim(),
      viewerPath: String(payload.viewerPath || "").trim(),
      constructorName: String(payload.constructorName || "ElectricFieldApp").trim(),
      assetUrlOptionKey: String(payload.assetUrlOptionKey || "sceneUrl").trim(),
      matchExtensions: Array.isArray(payload.matchExtensions) ? payload.matchExtensions : [],
      defaultOptions:
        payload.defaultOptions && typeof payload.defaultOptions === "object" && !Array.isArray(payload.defaultOptions)
          ? payload.defaultOptions
          : {},
      enabled: payload.enabled !== false,
    }),
  });
}

export async function updateLibraryEmbedProfile(
  profileId: string,
  patch: Partial<{
    name: string;
    scriptUrl: string;
    fallbackScriptUrl: string;
    viewerPath: string;
    constructorName: string;
    assetUrlOptionKey: string;
    matchExtensions: string[];
    defaultOptions: Record<string, unknown>;
    enabled: boolean;
  }>,
): Promise<any> {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = String(patch.name || "").trim();
  if (patch.scriptUrl !== undefined) body.scriptUrl = String(patch.scriptUrl || "").trim();
  if (patch.fallbackScriptUrl !== undefined) body.fallbackScriptUrl = String(patch.fallbackScriptUrl || "").trim();
  if (patch.viewerPath !== undefined) body.viewerPath = String(patch.viewerPath || "").trim();
  if (patch.constructorName !== undefined) body.constructorName = String(patch.constructorName || "").trim();
  if (patch.assetUrlOptionKey !== undefined) body.assetUrlOptionKey = String(patch.assetUrlOptionKey || "").trim();
  if (patch.matchExtensions !== undefined) body.matchExtensions = Array.isArray(patch.matchExtensions) ? patch.matchExtensions : [];
  if (patch.defaultOptions !== undefined) {
    body.defaultOptions =
      patch.defaultOptions && typeof patch.defaultOptions === "object" && !Array.isArray(patch.defaultOptions)
        ? patch.defaultOptions
        : {};
  }
  if (patch.enabled !== undefined) body.enabled = patch.enabled === true;

  return apiFetch(`/api/library/embed-profiles/${encodeURIComponent(profileId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteLibraryEmbedProfile(profileId: string): Promise<any> {
  return apiFetch(`/api/library/embed-profiles/${encodeURIComponent(profileId)}`, {
    method: "DELETE",
  });
}

export async function syncLibraryEmbedProfile(profileId: string): Promise<any> {
  return apiFetch(`/api/library/embed-profiles/${encodeURIComponent(profileId)}/sync`, {
    method: "POST",
  });
}

export async function updateLibraryAsset(
  assetId: string,
  patch: {
    displayName?: string;
    openMode?: LibraryOpenMode;
    folderId?: string;
    embedProfileId?: string;
    embedOptions?: Record<string, unknown>;
  },
): Promise<any> {
  const body: Record<string, unknown> = {};
  if (patch?.displayName !== undefined) {
    body.displayName = String(patch.displayName || "");
  }
  if (patch?.openMode !== undefined) {
    body.openMode = patch.openMode === "embed" ? "embed" : "download";
  }
  if (patch?.folderId !== undefined) {
    body.folderId = String(patch.folderId || "").trim();
  }
  if (patch?.embedProfileId !== undefined) {
    body.embedProfileId = String(patch.embedProfileId || "").trim();
  }
  if (patch?.embedOptions !== undefined) {
    body.embedOptions =
      patch.embedOptions && typeof patch.embedOptions === "object" && !Array.isArray(patch.embedOptions)
        ? patch.embedOptions
        : {};
  }
  return apiFetch(`/api/library/assets/${encodeURIComponent(assetId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

export async function deleteLibraryAssetPermanently(assetId: string): Promise<any> {
  return apiFetch(`/api/library/assets/${encodeURIComponent(assetId)}/permanent`, {
    method: "DELETE",
  });
}

export async function restoreLibraryAsset(assetId: string): Promise<any> {
  return apiFetch(`/api/library/assets/${encodeURIComponent(assetId)}/restore`, {
    method: "POST",
  });
}
