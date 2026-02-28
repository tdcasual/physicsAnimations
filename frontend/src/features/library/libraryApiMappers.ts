import type { LibraryAsset, LibraryEmbedProfile, LibraryFolder } from "./types";

export function toFolder(value: any): LibraryFolder {
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

export function toAsset(value: any): LibraryAsset {
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
