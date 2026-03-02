const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createMemoryStore,
  createTestAdapterRegistry,
  createMockEmbedFetcher,
} = require("./helpers/libraryServiceFixtures");

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

test("syncEmbedProfile fails when required viewer dependency cannot be mirrored", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const store = createMemoryStore();
  const fetcher = async (url) => {
    const key = String(url || "");
    if (key.endsWith("/embed/embed.js")) {
      return new Response('console.log("embed");', {
        status: 200,
        headers: { "content-type": "application/javascript" },
      });
    }
    if (key.endsWith("/embed/viewer.html")) {
      return new Response('<script src="./assets/main.js"></script>', {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
  };

  const service = createLibraryService({
    store,
    deps: { fetcher },
  });
  const created = await service.createEmbedProfile({
    name: "Broken Viewer",
    scriptUrl: "https://field.infinitas.fun/embed/embed.js",
    viewerPath: "https://field.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);

  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced?.status, 502);
  assert.equal(synced?.error, "embed_profile_sync_failed");
});

test("updateEmbedProfile does not partially mutate profile when validation fails", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: { fetcher: createMockEmbedFetcher() },
  });

  const created = await service.createEmbedProfile({
    name: "Original Name",
    scriptUrl: "https://field.infinitas.fun/embed/embed.js",
    viewerPath: "https://field.infinitas.fun/embed/viewer.html",
    constructorName: "ElectricFieldApp",
  });
  assert.equal(created.ok, true);

  const failed = await service.updateEmbedProfile({
    profileId: created.profile.id,
    name: "Changed Name",
    constructorName: "1InvalidConstructor",
  });
  assert.equal(failed?.status, 400);
  assert.equal(failed?.error, "invalid_profile_constructor_name");

  const refreshed = await service.getEmbedProfileById({ profileId: created.profile.id });
  assert.ok(refreshed);
  assert.equal(refreshed.name, "Original Name");
  assert.equal(refreshed.constructorName, "ElectricFieldApp");
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
