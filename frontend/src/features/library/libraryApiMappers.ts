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

function toOpenMode(value: unknown): "embed" | "download" {
  const mode = String(value ?? "")
    .trim()
    .toLowerCase();
  if (mode === "embed" || mode === "download") return mode;
  throw new Error("invalid_open_mode");
}

function toObjectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function toSyncOptions(value: unknown): LibraryEmbedProfile["syncOptions"] {
  const source = toObjectRecord(value);
  const out: LibraryEmbedProfile["syncOptions"] = {};
  const maxFiles = toOptionalNumber(source.maxFiles);
  const maxTotalBytes = toOptionalNumber(source.maxTotalBytes);
  const maxFileBytes = toOptionalNumber(source.maxFileBytes);
  const timeoutMs = toOptionalNumber(source.timeoutMs);
  const concurrency = toOptionalNumber(source.concurrency);
  const keepReleases = toOptionalNumber(source.keepReleases);
  const retryMaxAttempts = toOptionalNumber(source.retryMaxAttempts);
  const retryBaseDelayMs = toOptionalNumber(source.retryBaseDelayMs);
  const strictSelfCheck = toOptionalBoolean(source.strictSelfCheck);
  if (maxFiles !== undefined) out.maxFiles = maxFiles;
  if (maxTotalBytes !== undefined) out.maxTotalBytes = maxTotalBytes;
  if (maxFileBytes !== undefined) out.maxFileBytes = maxFileBytes;
  if (timeoutMs !== undefined) out.timeoutMs = timeoutMs;
  if (concurrency !== undefined) out.concurrency = concurrency;
  if (keepReleases !== undefined) out.keepReleases = keepReleases;
  if (retryMaxAttempts !== undefined) out.retryMaxAttempts = retryMaxAttempts;
  if (retryBaseDelayMs !== undefined) out.retryBaseDelayMs = retryBaseDelayMs;
  if (strictSelfCheck !== undefined) out.strictSelfCheck = strictSelfCheck;
  return out;
}

function toSyncReport(value: unknown): LibraryEmbedProfile["syncLastReport"] {
  return toObjectRecord(value) as LibraryEmbedProfile["syncLastReport"];
}

function toSyncCache(value: unknown): LibraryEmbedProfile["syncCache"] {
  const source = toObjectRecord(value);
  const out: LibraryEmbedProfile["syncCache"] = {};
  for (const [rawUrl, rawEntry] of Object.entries(source)) {
    const url = String(rawUrl || "").trim();
    if (!url) continue;
    const entry = toObjectRecord(rawEntry);
    out[url] = {
      etag: String(entry.etag || ""),
      lastModified: String(entry.lastModified || ""),
      contentType: String(entry.contentType || ""),
      relativePath: String(entry.relativePath || ""),
    };
  }
  return out;
}

export function toFolder(value: unknown): LibraryFolder {
  const v = value as Record<string, unknown>;
  return {
    id: String(v?.id || ""),
    name: String(v?.name || ""),
    categoryId: String(v?.categoryId || "other"),
    coverType: v?.coverType === "image" ? "image" : "blank",
    coverPath: String(v?.coverPath || ""),
    parentId: toOptionalId(v?.parentId),
    order: toFiniteNumber(v?.order, 0),
    assetCount: toFiniteNumber(v?.assetCount, 0),
    createdAt: String(v?.createdAt || ""),
    updatedAt: String(v?.updatedAt || ""),
  };
}

export function toAsset(value: unknown): LibraryAsset {
  const v = value as Record<string, unknown>;
  const deleted = v?.deleted === true;
  return {
    id: String(v?.id || ""),
    folderId: String(v?.folderId || ""),
    adapterKey: String(v?.adapterKey || ""),
    displayName: String(v?.displayName || ""),
    fileName: String(v?.fileName || ""),
    filePath: String(v?.filePath || ""),
    fileSize: toFiniteNumber(v?.fileSize, 0),
    openMode: toOpenMode(v?.openMode),
    generatedEntryPath: String(v?.generatedEntryPath || ""),
    embedProfileId: String(v?.embedProfileId || ""),
    embedOptions: toObjectRecord(v?.embedOptions),
    status: v?.status === "failed" ? "failed" : "ready",
    deleted,
    deletedAt: deleted ? String(v?.deletedAt || "") : "",
    createdAt: String(v?.createdAt || ""),
    updatedAt: String(v?.updatedAt || ""),
  };
}

export function toEmbedProfile(value: unknown): LibraryEmbedProfile {
  const v = value as Record<string, unknown>;
  return {
    id: String(v?.id || ""),
    name: String(v?.name || ""),
    scriptUrl: String(v?.scriptUrl || ""),
    fallbackScriptUrl: String(v?.fallbackScriptUrl || ""),
    viewerPath: String(v?.viewerPath || ""),
    remoteScriptUrl: String(v?.remoteScriptUrl || v?.scriptUrl || ""),
    remoteViewerPath: String(v?.remoteViewerPath || v?.viewerPath || ""),
    syncStatus: String(v?.syncStatus || "pending"),
    syncMessage: String(v?.syncMessage || ""),
    lastSyncAt: String(v?.lastSyncAt || ""),
    constructorName: String(v?.constructorName || "ElectricFieldApp"),
    assetUrlOptionKey: String(v?.assetUrlOptionKey || "sceneUrl"),
    matchExtensions: Array.isArray(v?.matchExtensions)
      ? v.matchExtensions.map((item: unknown) => String(item || "").trim()).filter(Boolean)
      : [],
    defaultOptions: toObjectRecord(v?.defaultOptions),
    syncOptions: toSyncOptions(v?.syncOptions),
    syncLastReport: toSyncReport(v?.syncLastReport),
    syncCache: toSyncCache(v?.syncCache),
    activeReleaseId: String(v?.activeReleaseId || ""),
    releaseHistory: Array.isArray(v?.releaseHistory)
      ? v.releaseHistory.map((item: unknown) => String(item || "").trim()).filter(Boolean)
      : [],
    enabled: v?.enabled !== false,
    createdAt: String(v?.createdAt || ""),
    updatedAt: String(v?.updatedAt || ""),
  };
}
