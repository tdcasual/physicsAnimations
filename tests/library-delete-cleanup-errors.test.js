const test = require("node:test");
const assert = require("node:assert/strict");

const { createLibraryService } = require("../server/services/library/libraryService");
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

test("deleteAssetPermanently reports cleanup error and keeps deleted asset state", async () => {
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
    },
  });
  const folder = await service.createFolder({ name: "Recycle", categoryId: "other" });
  const uploaded = await service.uploadAsset({
    folderId: folder.id,
    fileBuffer: Buffer.from("GGBDATA"),
    originalName: "recycle.ggb",
    openMode: "embed",
  });
  assert.equal(uploaded?.ok, true);

  const removed = await service.deleteAsset({ assetId: uploaded.asset.id });
  assert.equal(removed?.ok, true);

  const originalDeletePath = store.deletePath;
  store.deletePath = async (prefix, options) => {
    if (String(prefix || "") === `library/assets/${uploaded.asset.id}` && options?.recursive === true) {
      throw new Error("delete_failed");
    }
    return originalDeletePath(prefix, options);
  };

  const failed = await service.deleteAssetPermanently({ assetId: uploaded.asset.id });
  assert.equal(failed?.status, 500);
  assert.equal(failed?.error, "asset_cleanup_failed");

  const stillDeleted = await service.getAssetById({ assetId: uploaded.asset.id, includeDeleted: true });
  assert.equal(stillDeleted?.deleted, true);
});

test("deleteEmbedProfile reports cleanup error and keeps profile state", async () => {
  const store = createMemoryStore();
  const service = createLibraryService({ store });
  const created = await service.createEmbedProfile({
    name: "Delete Fail",
    scriptUrl: "https://field.infinitas.fun/embed/embed.js",
    viewerPath: "https://field.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created?.ok, true);
  const profileId = created.profile.id;

  const originalDeletePath = store.deletePath;
  store.deletePath = async (prefix, options) => {
    if (
      String(prefix || "") === `library/vendor/embed-profiles/${profileId}` &&
      options?.recursive === true
    ) {
      throw new Error("delete_failed");
    }
    return originalDeletePath(prefix, options);
  };

  const failed = await service.deleteEmbedProfile({ profileId });
  assert.equal(failed?.status, 500);
  assert.equal(failed?.error, "embed_profile_cleanup_failed");

  const profiles = await service.listEmbedProfiles();
  assert.equal(profiles.some((item) => item.id === profileId), true);
});
