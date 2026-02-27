const test = require("node:test");
const assert = require("node:assert/strict");

const { createAdapterRegistry } = require("../server/services/library/adapters/registry");
const { createGeogebraAdapter } = require("../server/services/library/adapters/geogebra");

function createMemoryStore() {
  const blobs = new Map();
  return {
    blobs,
    async readBuffer(key) {
      return blobs.has(key) ? Buffer.from(blobs.get(key)) : null;
    },
    async writeBuffer(key, buffer) {
      blobs.set(key, Buffer.from(buffer));
    },
    async deletePath(prefix, options = {}) {
      const normalized = String(prefix || "").replace(/^\/+/, "").replace(/\/+$/, "");
      if (!normalized) return;
      if (options.recursive) {
        for (const key of Array.from(blobs.keys())) {
          if (key === normalized || key.startsWith(`${normalized}/`)) blobs.delete(key);
        }
        return;
      }
      blobs.delete(normalized);
    },
  };
}

function createTestAdapterRegistry() {
  return createAdapterRegistry([createGeogebraAdapter()]);
}

test("createLibraryService exposes core folder and asset operations", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({ store: createMemoryStore() });

  assert.equal(typeof service.createFolder, "function");
  assert.equal(typeof service.listFolders, "function");
  assert.equal(typeof service.uploadFolderCover, "function");
  assert.equal(typeof service.uploadAsset, "function");
  assert.equal(typeof service.listFolderAssets, "function");
  assert.equal(typeof service.getAssetOpenInfo, "function");
  assert.equal(typeof service.deleteFolder, "function");
  assert.equal(typeof service.deleteAsset, "function");
});

test("createLibraryService creates folder with blank cover by default", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({ store: createMemoryStore() });

  const created = await service.createFolder({
    name: "GGB Folder",
    categoryId: "mechanics",
  });

  assert.equal(created.name, "GGB Folder");
  assert.equal(created.categoryId, "mechanics");
  assert.equal(created.coverType, "blank");
  assert.equal(created.coverPath, "");
  assert.equal(created.parentId, null);

  const folders = await service.listFolders();
  assert.equal(folders.length, 1);
  assert.equal(folders[0].id, created.id);
});

test("uploadAsset stores .ggb and generates viewer in embed mode", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
    },
  });
  const folder = await service.createFolder({ name: "GGB", categoryId: "other" });

  const uploaded = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("GGBDATA"),
    originalName: "demo.ggb",
    openMode: "embed",
  });

  assert.equal(uploaded.ok, true);
  assert.equal(uploaded.asset.adapterKey, "geogebra");
  assert.equal(uploaded.asset.openMode, "embed");
  assert.match(uploaded.asset.filePath, /library\/assets\/.*\/source\/demo\.ggb$/);
  assert.match(uploaded.asset.generatedEntryPath, /library\/assets\/.*\/viewer\/index\.html$/);

  const keys = Array.from(store.blobs.keys());
  assert.equal(keys.some((key) => /\/source\/demo\.ggb$/.test(key)), true);
  assert.equal(keys.some((key) => /\/viewer\/index\.html$/.test(key)), true);

  const openInfo = await service.getAssetOpenInfo({ assetId: uploaded.asset.id });
  assert.equal(openInfo.mode, "embed");
  assert.match(openInfo.openUrl, /\/content\/library\/assets\/.*\/viewer\/index\.html$/);
  assert.match(openInfo.downloadUrl, /\/content\/library\/assets\/.*\/source\/demo\.ggb$/);
});

test("uploadAsset in download mode skips viewer generation", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
    },
  });
  const folder = await service.createFolder({ name: "GGB", categoryId: "other" });

  const uploaded = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("GGBDATA"),
    originalName: "only-download.ggb",
    openMode: "download",
  });

  assert.equal(uploaded.ok, true);
  assert.equal(uploaded.asset.openMode, "download");
  assert.equal(uploaded.asset.generatedEntryPath, "");

  const keys = Array.from(store.blobs.keys());
  assert.equal(keys.some((key) => /only-download\.ggb$/.test(key)), true);
  assert.equal(
    keys.some((key) => key.includes(`/library/assets/${uploaded.asset.id}/viewer/index.html`)),
    false,
  );

  const openInfo = await service.getAssetOpenInfo({ assetId: uploaded.asset.id });
  assert.equal(openInfo.mode, "download");
  assert.match(openInfo.openUrl, /\/content\/library\/assets\/.*\/source\/only-download\.ggb$/);
});

test("deleteFolder rejects non-empty folder with folder_not_empty", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
    },
  });
  const folder = await service.createFolder({ name: "GGB", categoryId: "other" });

  const uploaded = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("GGBDATA"),
    originalName: "demo.ggb",
    openMode: "embed",
  });
  assert.equal(uploaded.ok, true);

  const denied = await service.deleteFolder({ folderId: folder.id });
  assert.equal(denied?.status, 409);
  assert.equal(denied?.error, "folder_not_empty");

  const removed = await service.deleteAsset({ assetId: uploaded.asset.id });
  assert.equal(removed?.ok, true);

  const deleted = await service.deleteFolder({ folderId: folder.id });
  assert.equal(deleted?.ok, true);
});
