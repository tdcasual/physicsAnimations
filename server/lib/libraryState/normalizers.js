const LIBRARY_STATE_VERSION = 1;

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function toText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = toText(value).trim().toLowerCase();
  if (!text) return fallback;
  if (text === "1" || text === "true" || text === "yes" || text === "on") return true;
  if (text === "0" || text === "false" || text === "no" || text === "off") return false;
  return fallback;
}

function sanitizeJsonValue(value, depth = 0) {
  if (depth > 12) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      const sanitized = sanitizeJsonValue(item, depth + 1);
      if (sanitized !== undefined) out.push(sanitized);
    }
    return out;
  }
  if (!value || typeof value !== "object") return undefined;
  const out = {};
  for (const [rawKey, item] of Object.entries(value)) {
    const key = toText(rawKey).trim();
    if (!key) continue;
    const sanitized = sanitizeJsonValue(item, depth + 1);
    if (sanitized !== undefined) out[key] = sanitized;
  }
  return out;
}

function sanitizeJsonObject(value) {
  const out = sanitizeJsonValue(value);
  if (!out || typeof out !== "object" || Array.isArray(out)) return {};
  return out;
}

function normalizeExtensionList(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  const out = [];
  for (const item of source) {
    const ext = toText(item)
      .trim()
      .replace(/^\./, "")
      .toLowerCase();
    if (!ext) continue;
    if (!/^[a-z0-9_-]{1,24}$/i.test(ext)) continue;
    if (!out.includes(ext)) out.push(ext);
  }
  return out;
}

function sanitizeFolderEntry(value) {
  if (!value || typeof value !== "object") return null;
  const id = toText(value.id).trim();
  if (!id) return null;

  const coverType = toText(value.coverType).trim() === "image" ? "image" : "blank";
  const parentIdRaw = toText(value.parentId).trim();
  const order = toInt(value.order, 0);

  return {
    id,
    name: toText(value.name),
    categoryId: toText(value.categoryId, "other") || "other",
    coverType,
    coverPath: coverType === "image" ? toText(value.coverPath) : "",
    parentId: parentIdRaw || null,
    order,
    createdAt: toText(value.createdAt),
    updatedAt: toText(value.updatedAt),
  };
}

function sanitizeAssetEntry(value) {
  if (!value || typeof value !== "object") return null;
  const id = toText(value.id).trim();
  if (!id) return null;

  const openMode = toText(value.openMode).trim() === "embed" ? "embed" : "download";
  const status = toText(value.status).trim() === "failed" ? "failed" : "ready";
  const deleted = toBool(value.deleted, false);

  return {
    id,
    folderId: toText(value.folderId),
    adapterKey: toText(value.adapterKey),
    displayName: toText(value.displayName),
    fileName: toText(value.fileName),
    filePath: toText(value.filePath),
    fileSize: Math.max(0, toInt(value.fileSize, 0)),
    openMode,
    generatedEntryPath: toText(value.generatedEntryPath),
    embedProfileId: toText(value.embedProfileId),
    embedOptions: sanitizeJsonObject(value.embedOptions),
    status,
    deleted,
    deletedAt: deleted ? toText(value.deletedAt) : "",
    createdAt: toText(value.createdAt),
    updatedAt: toText(value.updatedAt),
  };
}

function sanitizeEmbedProfileEntry(value) {
  if (!value || typeof value !== "object") return null;
  const id = toText(value.id).trim();
  if (!id) return null;

  return {
    id,
    name: toText(value.name),
    scriptUrl: toText(value.scriptUrl).trim(),
    fallbackScriptUrl: toText(value.fallbackScriptUrl).trim(),
    viewerPath: toText(value.viewerPath).trim(),
    remoteScriptUrl: toText(value.remoteScriptUrl).trim() || toText(value.scriptUrl).trim(),
    remoteViewerPath: toText(value.remoteViewerPath).trim() || toText(value.viewerPath).trim(),
    syncMode: toText(value.syncMode, "local_mirror").trim() || "local_mirror",
    syncStatus: toText(value.syncStatus, "pending").trim() || "pending",
    syncMessage: toText(value.syncMessage),
    lastSyncAt: toText(value.lastSyncAt),
    constructorName: toText(value.constructorName, "ElectricFieldApp").trim() || "ElectricFieldApp",
    assetUrlOptionKey: toText(value.assetUrlOptionKey, "sceneUrl").trim() || "sceneUrl",
    matchExtensions: normalizeExtensionList(value.matchExtensions),
    defaultOptions: sanitizeJsonObject(value.defaultOptions),
    enabled: toBool(value.enabled, true),
    createdAt: toText(value.createdAt),
    updatedAt: toText(value.updatedAt),
  };
}

function normalizeFoldersPayload(raw) {
  if (!raw || typeof raw !== "object") {
    return { version: LIBRARY_STATE_VERSION, folders: [] };
  }
  const source = Array.isArray(raw.folders) ? raw.folders : [];
  const folders = [];
  for (const item of source) {
    const folder = sanitizeFolderEntry(item);
    if (folder) folders.push(folder);
  }
  return { version: LIBRARY_STATE_VERSION, folders };
}

function normalizeAssetsPayload(raw) {
  if (!raw || typeof raw !== "object") {
    return { version: LIBRARY_STATE_VERSION, assets: [] };
  }
  const source = Array.isArray(raw.assets) ? raw.assets : [];
  const assets = [];
  for (const item of source) {
    const asset = sanitizeAssetEntry(item);
    if (asset) assets.push(asset);
  }
  return { version: LIBRARY_STATE_VERSION, assets };
}

function normalizeEmbedProfilesPayload(raw) {
  if (!raw || typeof raw !== "object") {
    return { version: LIBRARY_STATE_VERSION, profiles: [] };
  }
  const source = Array.isArray(raw.profiles) ? raw.profiles : [];
  const profiles = [];
  for (const item of source) {
    const profile = sanitizeEmbedProfileEntry(item);
    if (profile) profiles.push(profile);
  }
  return { version: LIBRARY_STATE_VERSION, profiles };
}

module.exports = {
  LIBRARY_STATE_VERSION,
  normalizeFoldersPayload,
  normalizeAssetsPayload,
  normalizeEmbedProfilesPayload,
};
