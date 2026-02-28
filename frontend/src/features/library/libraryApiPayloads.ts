import type { LibraryOpenMode } from "./types";

export type CreateLibraryFolderPayload = {
  name: string;
  categoryId: string;
  coverType?: "blank" | "image";
};

export type UpdateLibraryFolderPatch = Partial<{
  name: string;
  categoryId: string;
}>;

export type UploadLibraryAssetPayload = {
  folderId: string;
  file: File;
  openMode: LibraryOpenMode;
  displayName?: string;
  embedProfileId?: string;
  embedOptionsJson?: string;
};

export type CreateLibraryEmbedProfilePayload = {
  name: string;
  scriptUrl: string;
  fallbackScriptUrl?: string;
  viewerPath?: string;
  constructorName?: string;
  assetUrlOptionKey?: string;
  matchExtensions?: string[];
  defaultOptions?: Record<string, unknown>;
  enabled?: boolean;
};

export type UpdateLibraryEmbedProfilePatch = Partial<{
  name: string;
  scriptUrl: string;
  fallbackScriptUrl: string;
  viewerPath: string;
  constructorName: string;
  assetUrlOptionKey: string;
  matchExtensions: string[];
  defaultOptions: Record<string, unknown>;
  enabled: boolean;
}>;

export type UpdateLibraryAssetPatch = {
  displayName?: string;
  openMode?: LibraryOpenMode;
  folderId?: string;
  embedProfileId?: string;
  embedOptions?: Record<string, unknown>;
};

export function buildCreateLibraryFolderBody(payload: CreateLibraryFolderPayload) {
  return {
    name: payload.name,
    categoryId: payload.categoryId || "other",
    coverType: payload.coverType || "blank",
  };
}

export function buildUpdateLibraryFolderBody(patch: UpdateLibraryFolderPatch): Record<string, string> {
  const body: Record<string, string> = {};
  if (patch.name !== undefined) body.name = String(patch.name || "").trim();
  if (patch.categoryId !== undefined) body.categoryId = String(patch.categoryId || "").trim();
  return body;
}

export function buildUploadLibraryAssetFormData(payload: UploadLibraryAssetPayload): FormData {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("openMode", payload.openMode || "embed");
  formData.append("displayName", String(payload.displayName || "").trim());
  if (payload.embedProfileId) {
    formData.append("embedProfileId", String(payload.embedProfileId || "").trim());
  }
  formData.append("embedOptionsJson", String(payload.embedOptionsJson || "").trim());
  return formData;
}

export function buildCreateLibraryEmbedProfileBody(payload: CreateLibraryEmbedProfilePayload) {
  return {
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
  };
}

export function buildUpdateLibraryEmbedProfileBody(patch: UpdateLibraryEmbedProfilePatch): Record<string, unknown> {
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
  return body;
}

export function buildUpdateLibraryAssetBody(patch: UpdateLibraryAssetPatch): Record<string, unknown> {
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
  return body;
}
