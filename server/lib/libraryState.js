const LIBRARY_FOLDERS_KEY = "library/folders.json";
const LIBRARY_ASSETS_KEY = "library/assets.json";
const LIBRARY_STATE_VERSION = 1;

const stateLocks = new Map();

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function toText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

async function withStateLock(key, fn) {
  const previous = stateLocks.get(key) || Promise.resolve();
  let release = () => {};
  const current = new Promise((resolve) => {
    release = resolve;
  });
  stateLocks.set(key, current);

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (stateLocks.get(key) === current) stateLocks.delete(key);
  }
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
    status,
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

async function loadLibraryFoldersState({ store }) {
  const raw = await store.readBuffer(LIBRARY_FOLDERS_KEY);
  if (!raw) return { version: LIBRARY_STATE_VERSION, folders: [] };

  let parsed = null;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return { version: LIBRARY_STATE_VERSION, folders: [] };
  }

  return normalizeFoldersPayload(parsed);
}

async function saveLibraryFoldersState({ store, state }) {
  const normalized = normalizeFoldersPayload(state);
  const json = Buffer.from(`${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await store.writeBuffer(LIBRARY_FOLDERS_KEY, json, { contentType: "application/json; charset=utf-8" });
}

async function mutateLibraryFoldersState({ store }, mutator) {
  return withStateLock(LIBRARY_FOLDERS_KEY, async () => {
    const state = await loadLibraryFoldersState({ store });
    const result = await mutator(state);
    await saveLibraryFoldersState({ store, state });
    return result;
  });
}

async function loadLibraryAssetsState({ store }) {
  const raw = await store.readBuffer(LIBRARY_ASSETS_KEY);
  if (!raw) return { version: LIBRARY_STATE_VERSION, assets: [] };

  let parsed = null;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return { version: LIBRARY_STATE_VERSION, assets: [] };
  }

  return normalizeAssetsPayload(parsed);
}

async function saveLibraryAssetsState({ store, state }) {
  const normalized = normalizeAssetsPayload(state);
  const json = Buffer.from(`${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await store.writeBuffer(LIBRARY_ASSETS_KEY, json, { contentType: "application/json; charset=utf-8" });
}

async function mutateLibraryAssetsState({ store }, mutator) {
  return withStateLock(LIBRARY_ASSETS_KEY, async () => {
    const state = await loadLibraryAssetsState({ store });
    const result = await mutator(state);
    await saveLibraryAssetsState({ store, state });
    return result;
  });
}

module.exports = {
  LIBRARY_FOLDERS_KEY,
  LIBRARY_ASSETS_KEY,
  loadLibraryFoldersState,
  saveLibraryFoldersState,
  mutateLibraryFoldersState,
  loadLibraryAssetsState,
  saveLibraryAssetsState,
  mutateLibraryAssetsState,
};
