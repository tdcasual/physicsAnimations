import type { LibraryAsset, LibraryEmbedProfile, LibraryFolder } from "./types";

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function toFolder(value: any): LibraryFolder {
  return {
    id: String(value?.id || ""),
    name: String(value?.name || ""),
    categoryId: String(value?.categoryId || "other"),
    coverType: value?.coverType === "image" ? "image" : "blank",
    coverPath: String(value?.coverPath || ""),
    parentId: toOptionalId(value?.parentId),
    order: toFiniteNumber(value?.order, 0),
    assetCount: toFiniteNumber(value?.assetCount, 0),
    createdAt: String(value?.createdAt || ""),
    updatedAt: String(value?.updatedAt || ""),
  };
}

export function toAsset(value: any): LibraryAsset {
  const deleted = value?.deleted === true;
  return {
    id: String(value?.id || ""),
    folderId: String(value?.folderId || ""),
    adapterKey: String(value?.adapterKey || ""),
    displayName: String(value?.displayName || ""),
    fileName: String(value?.fileName || ""),
    filePath: String(value?.filePath || ""),
    fileSize: toFiniteNumber(value?.fileSize, 0),
    openMode: value?.openMode === "download" ? "download" : "embed",
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
  };
}

export function toEmbedProfile(value: any): LibraryEmbedProfile {
  return {
    id: String(value?.id || ""),
    name: String(value?.name || ""),
    scriptUrl: String(value?.scriptUrl || ""),
    fallbackScriptUrl: String(value?.fallbackScriptUrl || ""),
    viewerPath: String(value?.viewerPath || ""),
    remoteScriptUrl: String(value?.remoteScriptUrl || value?.scriptUrl || ""),
    remoteViewerPath: String(value?.remoteViewerPath || value?.viewerPath || ""),
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
