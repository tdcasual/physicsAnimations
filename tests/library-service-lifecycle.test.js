const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createMemoryStore,
  createTestAdapterRegistry,
  createMockEmbedFetcher,
} = require("./helpers/libraryServiceFixtures");

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

test("deleteFolder reports cleanup error when deleting recycled asset files fails", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
    },
  });
  const folder = await service.createFolder({ name: "Cleanup", categoryId: "other" });

  const uploaded = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("GGBDATA"),
    originalName: "cleanup-demo.ggb",
    openMode: "embed",
  });
  assert.equal(uploaded.ok, true);

  const removed = await service.deleteAsset({ assetId: uploaded.asset.id });
  assert.equal(removed?.ok, true);

  const originalDeletePath = store.deletePath;
  store.deletePath = async (prefix, options) => {
    if (String(prefix || "").startsWith("library/assets/")) {
      throw new Error("cleanup_failed");
    }
    return originalDeletePath(prefix, options);
  };

  const failed = await service.deleteFolder({ folderId: folder.id });
  assert.equal(failed?.status, 500);
  assert.equal(failed?.error, "folder_asset_cleanup_failed");

  const folders = await service.listFolders();
  assert.equal(folders.some((item) => item.id === folder.id), true);
  const deletedAssets = await service.listDeletedAssets({ folderId: folder.id });
  assert.equal(deletedAssets.length, 1);
  assert.equal(deletedAssets[0].id, uploaded.asset.id);
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

test("restoreAsset fails when referenced embed profile has been removed", async () => {
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
  assert.equal(restored?.status, 409);
  assert.equal(restored?.error, "embed_profile_not_found");

  const current = await service.getAssetById({ assetId: uploaded.asset.id, includeDeleted: true });
  assert.equal(current?.deleted, true);
  assert.equal(current?.embedProfileId, profile.profile.id);
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
