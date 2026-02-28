import { clearToken, getToken } from "../auth/authApi";
import type {
  LibraryAssetOpenInfo,
  LibraryCatalogResponse,
  LibraryEmbedProfile,
  LibraryFolder,
  LibraryFolderAssetsResponse,
} from "./types";
import { toAsset, toEmbedProfile, toFolder } from "./libraryApiMappers";
import {
  buildCreateLibraryEmbedProfileBody,
  buildCreateLibraryFolderBody,
  buildUpdateLibraryAssetBody,
  buildUpdateLibraryEmbedProfileBody,
  buildUpdateLibraryFolderBody,
  buildUploadLibraryAssetFormData,
  type CreateLibraryEmbedProfilePayload,
  type CreateLibraryFolderPayload,
  type UpdateLibraryAssetPatch,
  type UpdateLibraryEmbedProfilePatch,
  type UpdateLibraryFolderPatch,
  type UploadLibraryAssetPayload,
} from "./libraryApiPayloads";

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

export async function createLibraryFolder(payload: CreateLibraryFolderPayload): Promise<any> {
  return apiFetch("/api/library/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildCreateLibraryFolderBody(payload)),
  });
}

export async function updateLibraryFolder(
  folderId: string,
  patch: UpdateLibraryFolderPatch,
): Promise<any> {
  return apiFetch(`/api/library/folders/${encodeURIComponent(folderId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildUpdateLibraryFolderBody(patch)),
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

export async function uploadLibraryAsset(payload: UploadLibraryAssetPayload): Promise<any> {
  return apiFetch(`/api/library/folders/${encodeURIComponent(payload.folderId)}/assets`, {
    method: "POST",
    body: buildUploadLibraryAssetFormData(payload),
  });
}

export async function createLibraryEmbedProfile(payload: CreateLibraryEmbedProfilePayload): Promise<any> {
  return apiFetch("/api/library/embed-profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildCreateLibraryEmbedProfileBody(payload)),
  });
}

export async function updateLibraryEmbedProfile(
  profileId: string,
  patch: UpdateLibraryEmbedProfilePatch,
): Promise<any> {
  return apiFetch(`/api/library/embed-profiles/${encodeURIComponent(profileId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildUpdateLibraryEmbedProfileBody(patch)),
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
  patch: UpdateLibraryAssetPatch,
): Promise<any> {
  return apiFetch(`/api/library/assets/${encodeURIComponent(assetId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildUpdateLibraryAssetBody(patch)),
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
