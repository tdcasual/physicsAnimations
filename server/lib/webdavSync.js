const fs = require("fs");
const path = require("path");

const { createWebdavStore } = require("./contentStore");
const {
  guessContentType,
  parseJsonBuffer,
  readLocalBuffer,
  serializeJson,
  shouldSkip,
  walkFiles,
  writeLocalBuffer,
} = require("./webdavSync/fileUtils");
const { mergeBuiltinItems, mergeCategories, mergeItemsAndTombstones } = require("./webdavSync/stateMerge");
const { scanRemoteUploads } = require("./webdavSync/remoteScan");

const ITEMS_STATE_KEY = "items.json";
const CATEGORIES_STATE_KEY = "categories.json";
const BUILTIN_ITEMS_STATE_KEY = "builtin_items.json";
const ITEM_TOMBSTONES_KEY = "items_tombstones.json";

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
  syncWithWebdav,
};
