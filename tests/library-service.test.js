const test = require("node:test");
const assert = require("node:assert/strict");

const { createAdapterRegistry } = require("../server/services/library/adapters/registry");
const { createGeogebraAdapter } = require("../server/services/library/adapters/geogebra");
const { createPhETAdapter } = require("../server/services/library/adapters/phet");

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
  return createAdapterRegistry([createGeogebraAdapter(), createPhETAdapter()]);
}

test("createAssetsService exposes stable asset operations", async () => {
  const { createAssetsService } = require("../server/services/library/assetsService");
  const service = createAssetsService({
    store: createMemoryStore(),
    adapterRegistry: createTestAdapterRegistry(),
    loadLibraryAssetsState: async () => ({ assets: [] }),
    mutateLibraryAssetsState: async () => {},
    getFolderById: async () => ({ id: "f_1" }),
    getEmbedProfileById: async () => null,
    generateViewerFromAssetMeta: async () => ({ ok: true, generatedEntryPath: "content/library/assets/a_1/viewer/index.html" }),
  });

  assert.equal(typeof service.listFolderAssets, "function");
  assert.equal(typeof service.getAssetById, "function");
  assert.equal(typeof service.listDeletedAssets, "function");
  assert.equal(typeof service.uploadAsset, "function");
  assert.equal(typeof service.updateAsset, "function");
  assert.equal(typeof service.getAssetOpenInfo, "function");
  assert.equal(typeof service.deleteAsset, "function");
  assert.equal(typeof service.deleteAssetPermanently, "function");
  assert.equal(typeof service.restoreAsset, "function");
});

function createMockEmbedFetcher(baseUrl = "https://field.infinitas.fun") {
  const embedJs = `
    (function (global) {
      function ElectricFieldApp(options) { this.options = options || {}; }
      ElectricFieldApp.prototype.inject = function () {};
      global.ElectricFieldApp = ElectricFieldApp;
    })(window);
  `;
  const viewerHtml = `
    <!doctype html>
    <html>
      <head>
        <script type="module" src="./assets/main.js"></script>
        <link rel="stylesheet" href="./assets/main.css" />
      </head>
      <body><div id="root"></div></body>
    </html>
  `;
  const resources = new Map([
    [`${baseUrl}/embed/embed.js`, { body: embedJs, contentType: "application/javascript" }],
    [`${baseUrl}/embed/viewer.html`, { body: viewerHtml, contentType: "text/html; charset=utf-8" }],
    [`${baseUrl}/embed/assets/main.js`, { body: 'import "./chunk.js";', contentType: "application/javascript" }],
    [`${baseUrl}/embed/assets/chunk.js`, { body: 'console.log("chunk");', contentType: "application/javascript" }],
    [`${baseUrl}/embed/assets/main.css`, { body: "#root{min-height:100vh;}", contentType: "text/css" }],
  ]);
  return async (url) => {
    const key = String(url || "");
    const item = resources.get(key);
    if (!item) {
      return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
    }
    return new Response(item.body, {
      status: 200,
      headers: { "content-type": item.contentType },
    });
  };
}

test("createLibraryService exposes core folder and asset operations", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({ store: createMemoryStore() });

  assert.equal(typeof service.listEmbedProfiles, "function");
  assert.equal(typeof service.getEmbedProfileById, "function");
  assert.equal(typeof service.createEmbedProfile, "function");
  assert.equal(typeof service.updateEmbedProfile, "function");
  assert.equal(typeof service.syncEmbedProfile, "function");
  assert.equal(typeof service.deleteEmbedProfile, "function");
  assert.equal(typeof service.createFolder, "function");
  assert.equal(typeof service.listFolders, "function");
  assert.equal(typeof service.uploadFolderCover, "function");
  assert.equal(typeof service.uploadAsset, "function");
  assert.equal(typeof service.listFolderAssets, "function");
  assert.equal(typeof service.getAssetOpenInfo, "function");
  assert.equal(typeof service.updateAsset, "function");
  assert.equal(typeof service.deleteFolder, "function");
  assert.equal(typeof service.deleteAsset, "function");
  assert.equal(typeof service.deleteAssetPermanently, "function");
  assert.equal(typeof service.restoreAsset, "function");
  assert.equal(typeof service.listDeletedAssets, "function");
});

test("createEmbedProfile validates input and persists profile", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: { fetcher: createMockEmbedFetcher() },
  });

  const invalid = await service.createEmbedProfile({ name: "x", scriptUrl: "javascript:alert(1)" });
  assert.equal(invalid?.status, 400);

  const created = await service.createEmbedProfile({
    name: "电场仿真",
    scriptUrl: "https://field.infinitas.fun/embed/embed.js",
    viewerPath: "https://field.infinitas.fun/embed/viewer.html",
    constructorName: "ElectricFieldApp",
    assetUrlOptionKey: "sceneUrl",
    matchExtensions: ["json"],
    defaultOptions: { mode: "view" },
  });
  assert.equal(created.ok, true);
  assert.ok(created.profile.id);
  assert.equal(created.profile.name, "电场仿真");
  assert.match(created.profile.scriptUrl, /\/content\/library\/vendor\/embed-profiles\//);
  assert.equal(created.profile.syncStatus, "ok");

  const list = await service.listEmbedProfiles();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, created.profile.id);
});

test("syncEmbedProfile refreshes local mirrored bundle", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: { fetcher: createMockEmbedFetcher() },
  });

  const created = await service.createEmbedProfile({
    name: "电场仿真",
    scriptUrl: "https://field.infinitas.fun/embed/embed.js",
    viewerPath: "https://field.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);

  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced.ok, true);
  assert.equal(synced.profile.syncStatus, "ok");
  assert.match(synced.profile.scriptUrl, /\/content\/library\/vendor\/embed-profiles\//);

  const embedJsKey = `library/vendor/embed-profiles/${created.profile.id}/current/embed.js`;
  const mirrored = await store.readBuffer(embedJsKey);
  assert.ok(mirrored);
  assert.match(mirrored.toString("utf8"), /ElectricFieldApp/);
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
    displayName: "仅下载演示",
  });

  assert.equal(uploaded.ok, true);
  assert.equal(uploaded.asset.openMode, "download");
  assert.equal(uploaded.asset.displayName, "仅下载演示");
  assert.equal(uploaded.asset.generatedEntryPath, "");

  const keys = Array.from(store.blobs.keys());
  assert.equal(keys.some((key) => /only-download\.ggb$/.test(key)), true);
  assert.equal(
    keys.some((key) => key.includes(`/library/assets/${uploaded.asset.id}/viewer/index.html`)),
    false,
  );

  const openInfo = await service.getAssetOpenInfo({ assetId: uploaded.asset.id });
  assert.equal(openInfo.mode, "download");
  assert.equal(openInfo.asset.displayName, "仅下载演示");
  assert.match(openInfo.openUrl, /\/content\/library\/assets\/.*\/source\/only-download\.ggb$/);
});

test("uploadAsset defaults to embed mode when openMode is omitted", async () => {
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
    originalName: "default-embed.ggb",
  });

  assert.equal(uploaded.ok, true);
  assert.equal(uploaded.asset.openMode, "embed");
  assert.match(uploaded.asset.generatedEntryPath, /\/viewer\/index\.html$/);
});

test("updateAsset updates displayName and persists updatedAt", async () => {
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
    openMode: "download",
  });

  const updated = await service.updateAsset({
    assetId: uploaded.asset.id,
    displayName: "抛体运动（重命名）",
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.asset.displayName, "抛体运动（重命名）");
  assert.ok(typeof updated.asset.updatedAt === "string" && updated.asset.updatedAt.length > 0);

  const openInfo = await service.getAssetOpenInfo({ assetId: uploaded.asset.id });
  assert.equal(openInfo.asset.displayName, "抛体运动（重命名）");
});

test("updateAsset can switch a download asset to embed mode", async () => {
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
    originalName: "switch-mode.ggb",
    openMode: "download",
  });

  const switched = await service.updateAsset({
    assetId: uploaded.asset.id,
    openMode: "embed",
  });
  assert.equal(switched.ok, true);
  assert.equal(switched.asset.openMode, "embed");
  assert.match(switched.asset.generatedEntryPath, /\/viewer\/index\.html$/);

  const openInfo = await service.getAssetOpenInfo({ assetId: uploaded.asset.id });
  assert.equal(openInfo.mode, "embed");
  assert.match(openInfo.openUrl, /\/content\/library\/assets\/.*\/viewer\/index\.html$/);
});

test("uploadAsset supports PhET html and generates embed wrapper", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
    },
  });
  const folder = await service.createFolder({ name: "PhET", categoryId: "other" });
  const phetHtml = Buffer.from(
    "<html><body><iframe src=\"https://phet.colorado.edu/sims/html/projectile-motion/latest/projectile-motion_en.html\"></iframe></body></html>",
    "utf8",
  );

  const uploaded = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: phetHtml,
    originalName: "projectile-motion.phet.html",
    openMode: "embed",
  });

  assert.equal(uploaded.ok, true);
  assert.equal(uploaded.asset.adapterKey, "phet");
  assert.equal(uploaded.asset.openMode, "embed");
  assert.match(uploaded.asset.filePath, /projectile-motion\.phet\.html$/);
  assert.match(uploaded.asset.generatedEntryPath, /\/viewer\/index\.html$/);
});

test("uploadAsset supports custom embed profile with json config", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
      fetcher: createMockEmbedFetcher(),
    },
  });

  const profile = await service.createEmbedProfile({
    name: "电场仿真",
    scriptUrl: "https://field.infinitas.fun/embed/embed.js",
    viewerPath: "https://field.infinitas.fun/embed/viewer.html",
    constructorName: "ElectricFieldApp",
    assetUrlOptionKey: "sceneUrl",
    matchExtensions: ["json"],
    defaultOptions: { mode: "view", toolbar: true },
  });
  assert.equal(profile.ok, true);

  const folder = await service.createFolder({ name: "Custom", categoryId: "other" });
  const uploaded = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("{\"scene\":\"demo\"}", "utf8"),
    originalName: "field-scene.json",
    openMode: "embed",
    embedProfileId: profile.profile.id,
    embedOptions: { materialId: "abc-123", autoplay: true },
  });

  assert.equal(uploaded.ok, true);
  assert.equal(uploaded.asset.embedProfileId, profile.profile.id);
  assert.equal(uploaded.asset.adapterKey, `embed:${profile.profile.id}`);
  assert.deepEqual(uploaded.asset.embedOptions, { materialId: "abc-123", autoplay: true });
  assert.match(uploaded.asset.generatedEntryPath, /\/viewer\/index\.html$/);

  const viewerKey = `library/assets/${uploaded.asset.id}/viewer/index.html`;
  const viewer = await store.readBuffer(viewerKey);
  assert.ok(viewer);
  const html = viewer.toString("utf8");
  assert.match(html, /content\/library\/vendor\/embed-profiles/);
  assert.match(html, /ElectricFieldApp/);
  assert.match(html, /sceneUrl/);
  assert.match(html, /field-scene\.json/);
});

test("deleteEmbedProfile allows removing profile when only soft-deleted assets reference it", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
      fetcher: createMockEmbedFetcher(),
    },
  });

  const profile = await service.createEmbedProfile({
    name: "电场仿真",
    scriptUrl: "https://field.infinitas.fun/embed/embed.js",
    viewerPath: "https://field.infinitas.fun/embed/viewer.html",
    constructorName: "ElectricFieldApp",
    assetUrlOptionKey: "sceneUrl",
    matchExtensions: ["json"],
  });
  assert.equal(profile.ok, true);

  const folder = await service.createFolder({ name: "Custom", categoryId: "other" });
  const uploaded = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("{\"scene\":\"demo\"}", "utf8"),
    originalName: "field-scene.json",
    openMode: "embed",
    embedProfileId: profile.profile.id,
  });
  assert.equal(uploaded.ok, true);

  const removedAsset = await service.deleteAsset({ assetId: uploaded.asset.id });
  assert.equal(removedAsset?.ok, true);

  const removedProfile = await service.deleteEmbedProfile({ profileId: profile.profile.id });
  assert.equal(removedProfile?.ok, true);

  const profiles = await service.listEmbedProfiles();
  assert.equal(profiles.length, 0);
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

test("deleteAsset marks resource as deleted and restoreAsset recovers it", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
    },
  });
  const folder = await service.createFolder({ name: "恢复测试", categoryId: "other" });
  const uploaded = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("GGBDATA"),
    originalName: "recover-demo.ggb",
    openMode: "embed",
  });
  assert.equal(uploaded?.ok, true);

  const removed = await service.deleteAsset({ assetId: uploaded.asset.id });
  assert.equal(removed?.ok, true);

  const list = await service.listFolderAssets({ folderId: folder.id });
  assert.equal(list.length, 0);

  const deletedOpenInfo = await service.getAssetOpenInfo({ assetId: uploaded.asset.id });
  assert.equal(deletedOpenInfo?.status, 404);
  assert.equal(deletedOpenInfo?.error, "asset_not_found");

  const deletedAssets = await service.listDeletedAssets({ folderId: folder.id });
  assert.equal(deletedAssets.length, 1);
  assert.equal(deletedAssets[0].id, uploaded.asset.id);
  assert.equal(deletedAssets[0].deleted, true);

  const restored = await service.restoreAsset({ assetId: uploaded.asset.id });
  assert.equal(restored?.ok, true);
  assert.equal(restored?.asset?.deleted, false);

  const restoredList = await service.listFolderAssets({ folderId: folder.id });
  assert.equal(restoredList.length, 1);
  assert.equal(restoredList[0].id, uploaded.asset.id);

  const openInfo = await service.getAssetOpenInfo({ assetId: uploaded.asset.id });
  assert.equal(openInfo?.ok, true);
  assert.equal(openInfo?.mode, "embed");
});

test("deleteAsset remains soft-delete and idempotent when called repeatedly", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
    },
  });
  const folder = await service.createFolder({ name: "二次删除", categoryId: "other" });
  const uploaded = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("GGBDATA"),
    originalName: "twice-delete.ggb",
    openMode: "embed",
  });
  assert.equal(uploaded?.ok, true);

  const firstDelete = await service.deleteAsset({ assetId: uploaded.asset.id });
  assert.equal(firstDelete?.ok, true);
  const firstDeletedList = await service.listDeletedAssets({ folderId: folder.id });
  assert.equal(firstDeletedList.length, 1);

  const secondDelete = await service.deleteAsset({ assetId: uploaded.asset.id });
  assert.equal(secondDelete?.ok, true);

  const deletedList = await service.listDeletedAssets({ folderId: folder.id });
  assert.equal(deletedList.length, 1);

  const existingAsset = await service.getAssetById({ assetId: uploaded.asset.id, includeDeleted: true });
  assert.equal(existingAsset?.deleted, true);

  const keyPrefix = `library/assets/${uploaded.asset.id}/`;
  const keys = Array.from(store.blobs.keys());
  assert.equal(keys.some((key) => key.startsWith(keyPrefix)), true);
});

test("deleteAssetPermanently hard-deletes soft-deleted resource and files", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
    },
  });
  const folder = await service.createFolder({ name: "永久删除", categoryId: "other" });
  const uploaded = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("GGBDATA"),
    originalName: "hard-delete.ggb",
    openMode: "embed",
  });
  assert.equal(uploaded?.ok, true);

  const firstDelete = await service.deleteAsset({ assetId: uploaded.asset.id });
  assert.equal(firstDelete?.ok, true);

  const hardDelete = await service.deleteAssetPermanently({ assetId: uploaded.asset.id });
  assert.equal(hardDelete?.ok, true);

  const deletedList = await service.listDeletedAssets({ folderId: folder.id });
  assert.equal(deletedList.length, 0);

  const removedAsset = await service.getAssetById({ assetId: uploaded.asset.id, includeDeleted: true });
  assert.equal(removedAsset, null);

  const keyPrefix = `library/assets/${uploaded.asset.id}/`;
  const keys = Array.from(store.blobs.keys());
  assert.equal(keys.some((key) => key.startsWith(keyPrefix)), false);
});

test("restoreAsset falls back to download when referenced embed profile has been removed", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
      fetcher: createMockEmbedFetcher(),
    },
  });

  const profile = await service.createEmbedProfile({
    name: "电场仿真",
    scriptUrl: "https://field.infinitas.fun/embed/embed.js",
    viewerPath: "https://field.infinitas.fun/embed/viewer.html",
    constructorName: "ElectricFieldApp",
    assetUrlOptionKey: "sceneUrl",
    matchExtensions: ["json"],
  });
  assert.equal(profile.ok, true);

  const folder = await service.createFolder({ name: "Custom", categoryId: "other" });
  const uploaded = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("{\"scene\":\"demo\"}", "utf8"),
    originalName: "field-scene.json",
    openMode: "embed",
    embedProfileId: profile.profile.id,
  });
  assert.equal(uploaded.ok, true);

  const removed = await service.deleteAsset({ assetId: uploaded.asset.id });
  assert.equal(removed?.ok, true);

  const removedProfile = await service.deleteEmbedProfile({ profileId: profile.profile.id });
  assert.equal(removedProfile?.ok, true);

  const restored = await service.restoreAsset({ assetId: uploaded.asset.id });
  assert.equal(restored?.ok, true);
  assert.equal(restored?.asset?.deleted, false);
  assert.equal(restored?.asset?.openMode, "download");
  assert.equal(restored?.asset?.embedProfileId, "");
  assert.equal(restored?.asset?.generatedEntryPath, "");

  const info = await service.getAssetOpenInfo({ assetId: uploaded.asset.id });
  assert.equal(info?.ok, true);
  assert.equal(info?.mode, "download");
  assert.match(info?.openUrl || "", /\/content\/library\/assets\/.*\/source\/field-scene\.json$/);
});

test("getFolderById includes live assetCount for admin refresh flow", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
    },
  });

  const folder = await service.createFolder({ name: "计数测试", categoryId: "other" });
  const uploadedA = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("A"),
    originalName: "a.ggb",
    openMode: "embed",
  });
  const uploadedB = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("B"),
    originalName: "b.ggb",
    openMode: "embed",
  });
  assert.equal(uploadedA?.ok, true);
  assert.equal(uploadedB?.ok, true);

  await service.deleteAsset({ assetId: uploadedB.asset.id });

  const loaded = await service.getFolderById({ folderId: folder.id, withAssetCount: true });
  assert.equal(loaded?.id, folder.id);
  assert.equal(loaded?.assetCount, 1);
});

test("updateFolder updates name/category and persists", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({ store: createMemoryStore() });

  const folder = await service.createFolder({ name: "旧文件夹", categoryId: "other" });
  const updated = await service.updateFolder({
    folderId: folder.id,
    name: "新文件夹",
    categoryId: "mechanics",
  });
  assert.equal(updated?.ok, true);
  assert.equal(updated?.folder?.name, "新文件夹");
  assert.equal(updated?.folder?.categoryId, "mechanics");

  const loaded = await service.getFolderById({ folderId: folder.id });
  assert.equal(loaded?.name, "新文件夹");
  assert.equal(loaded?.categoryId, "mechanics");
});

test("updateAsset supports moving folder and replacing embed profile/options", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
      fetcher: createMockEmbedFetcher(),
    },
  });

  const profileA = await service.createEmbedProfile({
    name: "平台A",
    scriptUrl: "https://field.infinitas.fun/embed/embed.js",
    viewerPath: "https://field.infinitas.fun/embed/viewer.html",
    constructorName: "ElectricFieldApp",
    assetUrlOptionKey: "sceneUrl",
    matchExtensions: ["json"],
  });
  const profileB = await service.createEmbedProfile({
    name: "平台B",
    scriptUrl: "https://field.infinitas.fun/embed/embed.js",
    viewerPath: "https://field.infinitas.fun/embed/viewer.html",
    constructorName: "ElectricFieldApp",
    assetUrlOptionKey: "sceneUrl",
    matchExtensions: ["json"],
  });
  assert.equal(profileA?.ok, true);
  assert.equal(profileB?.ok, true);

  const folderA = await service.createFolder({ name: "A", categoryId: "other" });
  const folderB = await service.createFolder({ name: "B", categoryId: "mechanics" });
  const uploaded = await service.uploadAsset({
    folderId: folderA.id,
    fileBuffer: Buffer.from("{\"scene\":\"a\"}", "utf8"),
    originalName: "scene.json",
    openMode: "embed",
    embedProfileId: profileA.profile.id,
    embedOptions: { sceneId: "A-1" },
  });
  assert.equal(uploaded?.ok, true);

  const updated = await service.updateAsset({
    assetId: uploaded.asset.id,
    folderId: folderB.id,
    embedProfileId: profileB.profile.id,
    embedOptions: { sceneId: "B-9", autoplay: true },
  });
  assert.equal(updated?.ok, true);
  assert.equal(updated?.asset?.folderId, folderB.id);
  assert.equal(updated?.asset?.embedProfileId, profileB.profile.id);
  assert.equal(updated?.asset?.adapterKey, `embed:${profileB.profile.id}`);
  assert.deepEqual(updated?.asset?.embedOptions, { sceneId: "B-9", autoplay: true });

  const listA = await service.listFolderAssets({ folderId: folderA.id });
  const listB = await service.listFolderAssets({ folderId: folderB.id });
  assert.equal(listA.length, 0);
  assert.equal(listB.length, 1);
  assert.equal(listB[0].id, uploaded.asset.id);
});
