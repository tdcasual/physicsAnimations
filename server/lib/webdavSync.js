const fs = require("fs");
const path = require("path");

const { createWebdavStore } = require("./contentStore");

const SKIP_FILES = new Set([".jwt_secret", "system.json"]);
const ITEMS_STATE_KEY = "items.json";
const CATEGORIES_STATE_KEY = "categories.json";
const BUILTIN_ITEMS_STATE_KEY = "builtin_items.json";
const ITEM_TOMBSTONES_KEY = "items_tombstones.json";

function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;

  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.isFile()) out.push(full);
    }
  }
  return out;
}

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".json": "application/json; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".wasm": "application/wasm",
    ".txt": "text/plain; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}

function shouldSkip(relPath) {
  const normalized = relPath.split(path.sep).join("/");
  const baseName = path.basename(normalized);
  if (SKIP_FILES.has(baseName)) return true;
  if (baseName.startsWith(".") && baseName !== ".well-known") return true;
  return false;
}

function readLocalBuffer({ rootDir, key }) {
  const filePath = path.join(rootDir, "content", key);
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

function writeLocalBuffer({ rootDir, key, buffer }) {
  const filePath = path.join(rootDir, "content", key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

function parseJsonBuffer(buf) {
  if (!buf || !buf.length) return null;
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    return null;
  }
}

function toTimeMs(value) {
  if (typeof value !== "string" || !value.trim()) return 0;
  const date = new Date(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return 0;
  return ms;
}

function normalizeItemsState(raw) {
  if (!raw || typeof raw !== "object") return { version: 2, items: [] };
  const items = Array.isArray(raw.items) ? raw.items.filter((it) => it && typeof it === "object") : [];
  return { version: 2, items };
}

function normalizeBuiltinItemsState(raw) {
  if (!raw || typeof raw !== "object") return { version: 1, items: {} };
  const items = raw.items && typeof raw.items === "object" ? raw.items : {};
  return { version: 1, items };
}

function normalizeCategoriesState(raw) {
  if (!raw || typeof raw !== "object") return { version: 2, groups: {}, categories: {} };
  const groups = raw.groups && typeof raw.groups === "object" ? raw.groups : {};
  const categories = raw.categories && typeof raw.categories === "object" ? raw.categories : {};
  return { version: 2, groups, categories };
}

function normalizeTombstonesState(raw) {
  if (!raw || typeof raw !== "object") return { version: 1, tombstones: {} };
  const tombstones = raw.tombstones && typeof raw.tombstones === "object" ? raw.tombstones : {};
  return { version: 1, tombstones };
}

function serializeJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function mergeBuiltinItems(localRaw, remoteRaw) {
  const local = normalizeBuiltinItemsState(localRaw);
  const remote = normalizeBuiltinItemsState(remoteRaw);
  const out = {};

  const ids = new Set([...Object.keys(remote.items || {}), ...Object.keys(local.items || {})]);
  for (const id of ids) {
    const localEntry = local.items?.[id] && typeof local.items[id] === "object" ? local.items[id] : null;
    const remoteEntry = remote.items?.[id] && typeof remote.items[id] === "object" ? remote.items[id] : null;

    if (localEntry && !remoteEntry) {
      out[id] = localEntry;
      continue;
    }
    if (!localEntry && remoteEntry) {
      out[id] = remoteEntry;
      continue;
    }
    if (!localEntry && !remoteEntry) continue;
    out[id] = localEntry;
  }

  return { version: 1, items: out };
}

function mergeCategories(localRaw, remoteRaw) {
  const local = normalizeCategoriesState(localRaw);
  const remote = normalizeCategoriesState(remoteRaw);

  function mergeConfigMap(localMap, remoteMap) {
    const out = {};
    const ids = new Set([...Object.keys(remoteMap || {}), ...Object.keys(localMap || {})]);
    for (const id of ids) {
      const localEntry = localMap?.[id] && typeof localMap[id] === "object" ? localMap[id] : null;
      const remoteEntry = remoteMap?.[id] && typeof remoteMap[id] === "object" ? remoteMap[id] : null;

      if (localEntry && !remoteEntry) {
        out[id] = localEntry;
        continue;
      }
      if (!localEntry && remoteEntry) {
        out[id] = remoteEntry;
        continue;
      }
      if (!localEntry && !remoteEntry) continue;
      out[id] = localEntry;
    }
    return out;
  }

  return {
    version: 2,
    groups: mergeConfigMap(local.groups, remote.groups),
    categories: mergeConfigMap(local.categories, remote.categories),
  };
}

function mergeItemsAndTombstones(localItemsRaw, remoteItemsRaw, localTombRaw, remoteTombRaw) {
  const localState = normalizeItemsState(localItemsRaw);
  const remoteState = normalizeItemsState(remoteItemsRaw);
  const localTomb = normalizeTombstonesState(localTombRaw);
  const remoteTomb = normalizeTombstonesState(remoteTombRaw);

  const mergedTombstones = {};
  const tombIds = new Set([...Object.keys(remoteTomb.tombstones || {}), ...Object.keys(localTomb.tombstones || {})]);
  for (const id of tombIds) {
    const localEntry = localTomb.tombstones?.[id] && typeof localTomb.tombstones[id] === "object" ? localTomb.tombstones[id] : null;
    const remoteEntry = remoteTomb.tombstones?.[id] && typeof remoteTomb.tombstones[id] === "object" ? remoteTomb.tombstones[id] : null;
    const localTime = toTimeMs(localEntry?.deletedAt);
    const remoteTime = toTimeMs(remoteEntry?.deletedAt);
    if (localTime > remoteTime) mergedTombstones[id] = { deletedAt: localEntry.deletedAt };
    else if (remoteTime > localTime) mergedTombstones[id] = { deletedAt: remoteEntry.deletedAt };
    else if (localEntry?.deletedAt) mergedTombstones[id] = { deletedAt: localEntry.deletedAt };
    else if (remoteEntry?.deletedAt) mergedTombstones[id] = { deletedAt: remoteEntry.deletedAt };
  }

  const localById = new Map();
  for (const item of localState.items) {
    const id = typeof item.id === "string" ? item.id : "";
    if (id) localById.set(id, item);
  }
  const remoteById = new Map();
  for (const item of remoteState.items) {
    const id = typeof item.id === "string" ? item.id : "";
    if (id) remoteById.set(id, item);
  }

  const ids = new Set([...localById.keys(), ...remoteById.keys(), ...Object.keys(mergedTombstones)]);
  const mergedItems = [];
  const nextTombstones = {};
  let deleted = 0;
  const conflicts = [];

  for (const id of ids) {
    const localItem = localById.get(id) || null;
    const remoteItem = remoteById.get(id) || null;
    const tomb = mergedTombstones[id] || null;

    const localTime = toTimeMs(localItem?.updatedAt) || toTimeMs(localItem?.createdAt);
    const remoteTime = toTimeMs(remoteItem?.updatedAt) || toTimeMs(remoteItem?.createdAt);
    const deletedTime = toTimeMs(tomb?.deletedAt);

    if (deletedTime && deletedTime >= localTime && deletedTime >= remoteTime) {
      deleted += 1;
      nextTombstones[id] = { deletedAt: tomb.deletedAt };
      continue;
    }

    if (localItem && remoteItem) {
      const localType = String(localItem.type || "");
      const remoteType = String(remoteItem.type || "");
      if (localType && remoteType && localType !== remoteType) {
        conflicts.push({ id, kind: "type_mismatch", localType, remoteType });
      }
    }
    if (localItem) {
      mergedItems.push(localItem);
    } else if (remoteItem) {
      mergedItems.push(remoteItem);
    }
  }

  mergedItems.sort((a, b) => {
    const timeDiff = String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    if (timeDiff) return timeDiff;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });

  return {
    itemsState: { version: 2, items: mergedItems },
    tombstonesState: { version: 1, tombstones: nextTombstones },
    deleted,
    conflicts,
  };
}

function normalizeRemotePath(value) {
  const cleaned = String(value || "").replace(/^\/+/, "");
  const normalized = path.posix.normalize(cleaned).replace(/^\/+/, "");
  if (!normalized || normalized === ".") return "";
  if (normalized.startsWith("..") || normalized.includes("/../")) return "";
  return normalized;
}

function extractHtmlTitleAndDescription(html) {
  const text = String(html || "");
  const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch ? String(titleMatch[1] || "").trim() : "";

  const descMatch =
    text.match(/<meta[^>]+name=[\"']description[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>/i) ||
    text.match(/<meta[^>]+content=[\"']([^\"']*)[\"'][^>]*name=[\"']description[\"'][^>]*>/i);
  const rawDesc = descMatch ? String(descMatch[1] || "").trim() : "";

  return { title: rawTitle, description: rawDesc };
}

async function scanRemoteUploads({ webdav, existingIds }) {
  const entries = await webdav.listDir("uploads");
  const imported = [];

  for (const entry of entries) {
    if (!entry?.isDir) continue;
    const id = String(entry.name || "").trim();
    if (!id) continue;
    if (!id.startsWith("u_")) continue;
    if (existingIds.has(id)) continue;

    const manifestBuf = await webdav.readBuffer(`uploads/${id}/manifest.json`);
    if (!manifestBuf) continue;
    const manifest = parseJsonBuffer(manifestBuf);
    if (!manifest || typeof manifest !== "object") continue;

    const entryRaw = typeof manifest.entry === "string" ? manifest.entry : "index.html";
    const entryRel = normalizeRemotePath(entryRaw) || "index.html";

    let title = "";
    let description = "";
    try {
      const htmlBuf = await webdav.readBuffer(`uploads/${id}/${entryRel}`);
      if (htmlBuf) {
        const meta = extractHtmlTitleAndDescription(htmlBuf.toString("utf8"));
        title = meta.title || "";
        description = meta.description || "";
      }
    } catch {
      // ignore
    }

    const createdAt =
      typeof manifest.createdAt === "string" && toTimeMs(manifest.createdAt) ? manifest.createdAt : new Date().toISOString();

    const files = Array.isArray(manifest.files) ? manifest.files.map((f) => String(f || "")) : [];
    const uploadKind = files.some((f) => f && !f.startsWith("deps/") && f !== "index.html") ? "zip" : "html";

    imported.push({
      id,
      type: "upload",
      categoryId: "other",
      path: `content/uploads/${id}/${entryRel}`,
      title: title || id,
      description,
      thumbnail: "",
      order: 0,
      published: true,
      hidden: false,
      uploadKind,
      createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  return imported;
}

async function syncLocalToWebdav({ rootDir, webdavConfig }) {
  const contentDir = path.join(rootDir, "content");
  const store = createWebdavStore(webdavConfig);

  const files = walkFiles(contentDir);
  let uploaded = 0;
  let skipped = 0;
  const skipKeys = new Set([ITEMS_STATE_KEY, CATEGORIES_STATE_KEY, BUILTIN_ITEMS_STATE_KEY, ITEM_TOMBSTONES_KEY]);

  for (const filePath of files) {
    const rel = path.relative(contentDir, filePath).split(path.sep).join("/");
    if (!rel || skipKeys.has(rel) || shouldSkip(rel)) {
      skipped += 1;
      continue;
    }
    const buf = fs.readFileSync(filePath);
    const contentType = guessContentType(filePath);
    await store.writeBuffer(rel, buf, { contentType });
    uploaded += 1;
  }

  return { uploaded, skipped };
}

async function syncWithWebdav({
  rootDir,
  webdavConfig,
  scanRemote = false,
} = {}) {
  const contentDir = path.join(rootDir, "content");
  const webdav = createWebdavStore(webdavConfig);

  const localItems = parseJsonBuffer(readLocalBuffer({ rootDir, key: ITEMS_STATE_KEY }));
  const localCategories = parseJsonBuffer(readLocalBuffer({ rootDir, key: CATEGORIES_STATE_KEY }));
  const localBuiltin = parseJsonBuffer(readLocalBuffer({ rootDir, key: BUILTIN_ITEMS_STATE_KEY }));
  const localTomb = parseJsonBuffer(readLocalBuffer({ rootDir, key: ITEM_TOMBSTONES_KEY }));

  const remoteItems = parseJsonBuffer(await webdav.readBuffer(ITEMS_STATE_KEY));
  const remoteCategories = parseJsonBuffer(await webdav.readBuffer(CATEGORIES_STATE_KEY));
  const remoteBuiltin = parseJsonBuffer(await webdav.readBuffer(BUILTIN_ITEMS_STATE_KEY));
  const remoteTomb = parseJsonBuffer(await webdav.readBuffer(ITEM_TOMBSTONES_KEY));

  const mergedBuiltin = mergeBuiltinItems(localBuiltin, remoteBuiltin);
  const mergedCategories = mergeCategories(localCategories, remoteCategories);
  const mergedItemsPack = mergeItemsAndTombstones(localItems, remoteItems, localTomb, remoteTomb);

  let mergedItems = mergedItemsPack.itemsState;
  let mergedTombstones = mergedItemsPack.tombstonesState;

  const scanResult = { enabled: Boolean(scanRemote), found: 0, imported: 0, error: "" };
  if (scanRemote) {
    try {
      const existingIds = new Set(mergedItems.items.map((it) => String(it.id || "")).filter(Boolean));
      const importedItems = await scanRemoteUploads({ webdav, existingIds });
      scanResult.found = importedItems.length;
      if (importedItems.length) {
        mergedItems = {
          version: 2,
          items: [...mergedItems.items, ...importedItems],
        };
        scanResult.imported = importedItems.length;

        for (const item of importedItems) {
          if (!item?.id) continue;
          if (mergedTombstones.tombstones[item.id]) {
            delete mergedTombstones.tombstones[item.id];
          }
        }

        mergedItems.items.sort((a, b) => {
          const timeDiff = String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
          if (timeDiff) return timeDiff;
          return String(a.id || "").localeCompare(String(b.id || ""));
        });
      }
    } catch (err) {
      scanResult.error = err?.message || "scan_failed";
    }
  }

  const outFiles = [
    { key: ITEMS_STATE_KEY, value: mergedItems },
    { key: CATEGORIES_STATE_KEY, value: mergedCategories },
    { key: BUILTIN_ITEMS_STATE_KEY, value: mergedBuiltin },
    { key: ITEM_TOMBSTONES_KEY, value: mergedTombstones },
  ];

  for (const file of outFiles) {
    const buf = serializeJson(file.value);
    try {
      writeLocalBuffer({ rootDir, key: file.key, buffer: buf });
    } catch {
      // ignore local write errors (e.g., read-only env)
    }
    await webdav.writeBuffer(file.key, buf, { contentType: "application/json; charset=utf-8" });
  }

  const files = walkFiles(contentDir);
  let uploaded = 0;
  let skipped = 0;

  for (const filePath of files) {
    const rel = path.relative(contentDir, filePath).split(path.sep).join("/");
    if (!rel || shouldSkip(rel)) {
      skipped += 1;
      continue;
    }
    const buf = fs.readFileSync(filePath);
    const contentType = guessContentType(filePath);
    await webdav.writeBuffer(rel, buf, { contentType });
    uploaded += 1;
  }

  return {
    uploaded,
    skipped,
    merged: {
      dynamicDeleted: mergedItemsPack.deleted,
      dynamicConflicts: mergedItemsPack.conflicts,
    },
    scan: scanResult,
  };
}

module.exports = {
  syncLocalToWebdav,
  syncWithWebdav,
};
