import { clearToken, getToken } from "../auth/authApi";
import { apiFetchJson } from "../shared/httpClient";
import type {
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
  data?: Record<string, unknown> | null;
}

interface ApiErrorResponse {
  error?: string;
  [key: string]: unknown;
}

function toApiError(status: number, data: ApiErrorResponse | null): LibraryApiError {
  const code = typeof data?.error === "string" ? data.error : "request_failed";
  const err = new Error(code) as LibraryApiError;
  err.status = status;
  err.code = code;
  err.data = data;
  return err;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetchJson<T>({
    path,
    options,
    token: getToken(),
    onUnauthorized: () => {
      clearToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pa-auth-expired"));
      }
    },
    toError: (status, data) => toApiError(status, data as ApiErrorResponse | null),
  });
}

interface CatalogApiResponse {
  folders?: unknown[];
}

interface FoldersApiResponse {
  folders?: unknown[];
}

interface EmbedProfilesApiResponse {
  profiles?: unknown[];
}

interface FolderApiResponse {
  folder?: unknown;
}

interface AssetsApiResponse {
  assets?: unknown[];
}

interface ApiSuccessResponse {
  success?: boolean;
  [key: string]: unknown;
}

export async function listLibraryCatalog(): Promise<LibraryCatalogResponse> {
  const data = await apiFetch<CatalogApiResponse>("/api/library/catalog", { method: "GET" });
  const folders = Array.isArray(data?.folders) ? data.folders.map(toFolder) : [];
  return { folders };
}

export async function listLibraryFolders(): Promise<LibraryFolder[]> {
  const data = await apiFetch<FoldersApiResponse>("/api/library/folders", { method: "GET" });
  const folders = Array.isArray(data?.folders) ? data.folders.map(toFolder) : [];
  return folders;
}

export async function listLibraryEmbedProfiles(): Promise<LibraryEmbedProfile[]> {
  const data = await apiFetch<EmbedProfilesApiResponse>("/api/library/embed-profiles", { method: "GET" });
  const profiles = Array.isArray(data?.profiles) ? data.profiles.map(toEmbedProfile) : [];
  return profiles;
}

export async function getLibraryFolder(folderId: string): Promise<LibraryFolder> {
  const data = await apiFetch<FolderApiResponse>(`/api/library/folders/${encodeURIComponent(folderId)}`, { method: "GET" });
  return toFolder(data?.folder || {});
}

export async function listLibraryFolderAssets(folderId: string): Promise<LibraryFolderAssetsResponse> {
  const data = await apiFetch<AssetsApiResponse>(`/api/library/folders/${encodeURIComponent(folderId)}/assets`, {
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
  const data = await apiFetch<AssetsApiResponse>(path, { method: "GET" });
  const assets = Array.isArray(data?.assets) ? data.assets.map(toAsset) : [];
  return { assets };
}

export async function createLibraryFolder(payload: CreateLibraryFolderPayload): Promise<ApiSuccessResponse> {
  return apiFetch("/api/library/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildCreateLibraryFolderBody(payload)),
  });
}

export async function updateLibraryFolder(
  folderId: string,
  patch: UpdateLibraryFolderPatch,
): Promise<ApiSuccessResponse> {
  return apiFetch(`/api/library/folders/${encodeURIComponent(folderId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildUpdateLibraryFolderBody(patch)),
  });
}

export async function uploadLibraryFolderCover(payload: {
  folderId: string;
  file: File;
}): Promise<ApiSuccessResponse> {
  const formData = new FormData();
  formData.append("file", payload.file);

  return apiFetch(`/api/library/folders/${encodeURIComponent(payload.folderId)}/cover`, {
    method: "POST",
    body: formData,
  });
}

export async function uploadLibraryAsset(payload: UploadLibraryAssetPayload): Promise<ApiSuccessResponse> {
  return apiFetch(`/api/library/folders/${encodeURIComponent(payload.folderId)}/assets`, {
    method: "POST",
    body: buildUploadLibraryAssetFormData(payload),
  });
}

export async function createLibraryEmbedProfile(payload: CreateLibraryEmbedProfilePayload): Promise<ApiSuccessResponse> {
  return apiFetch("/api/library/embed-profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildCreateLibraryEmbedProfileBody(payload)),
  });
}

export async function updateLibraryEmbedProfile(
  profileId: string,
  patch: UpdateLibraryEmbedProfilePatch,
): Promise<ApiSuccessResponse> {
  return apiFetch(`/api/library/embed-profiles/${encodeURIComponent(profileId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildUpdateLibraryEmbedProfileBody(patch)),
  });
}

export async function deleteLibraryEmbedProfile(profileId: string): Promise<ApiSuccessResponse> {
  return apiFetch(`/api/library/embed-profiles/${encodeURIComponent(profileId)}`, {
    method: "DELETE",
  });
}

export async function syncLibraryEmbedProfile(profileId: string): Promise<ApiSuccessResponse> {
  return apiFetch(`/api/library/embed-profiles/${encodeURIComponent(profileId)}/sync`, {
    method: "POST",
  });
}

export async function updateLibraryAsset(
  assetId: string,
  patch: UpdateLibraryAssetPatch,
): Promise<ApiSuccessResponse> {
  return apiFetch(`/api/library/assets/${encodeURIComponent(assetId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildUpdateLibraryAssetBody(patch)),
  });
}

export async function deleteLibraryFolder(folderId: string): Promise<ApiSuccessResponse> {
  return apiFetch(`/api/library/folders/${encodeURIComponent(folderId)}`, {
    method: "DELETE",
  });
}

export async function deleteLibraryAsset(assetId: string): Promise<ApiSuccessResponse> {
  return apiFetch(`/api/library/assets/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
  });
}

export async function deleteLibraryAssetPermanently(assetId: string): Promise<ApiSuccessResponse> {
  return apiFetch(`/api/library/assets/${encodeURIComponent(assetId)}/permanent`, {
    method: "DELETE",
  });
}

export async function restoreLibraryAsset(assetId: string): Promise<ApiSuccessResponse> {
  return apiFetch(`/api/library/assets/${encodeURIComponent(assetId)}/restore`, {
    method: "POST",
  });
}
