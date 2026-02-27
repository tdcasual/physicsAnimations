const test = require("node:test");
const assert = require("node:assert/strict");

const { createLibraryService } = require("../server/services/library/libraryService");
const { createStateDbStore } = require("../server/lib/stateDb");

function createStoreStub() {
  return {
    async readBuffer() {
      return null;
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return null;
    },
  };
}

test("createLibraryService keeps stable method surface", () => {
  const service = createLibraryService({ store: createStoreStub() });
  const keys = Object.keys(service).sort();
  assert.deepEqual(keys, [
    "createEmbedProfile",
    "createFolder",
    "deleteAsset",
    "deleteAssetPermanently",
    "deleteEmbedProfile",
    "deleteFolder",
    "getAssetById",
    "getAssetOpenInfo",
    "getCatalogSummary",
    "getEmbedProfileById",
    "getFolderById",
    "listDeletedAssets",
    "listEmbedProfiles",
    "listFolderAssets",
    "listFolders",
    "restoreAsset",
    "syncEmbedProfile",
    "updateAsset",
    "updateEmbedProfile",
    "updateFolder",
    "uploadAsset",
    "uploadFolderCover",
  ]);
});

test("createStateDbStore returns wrapped object shape", () => {
  const store = createStoreStub();
  const wrapped = createStateDbStore({
    rootDir: process.cwd(),
    store,
    mode: "off",
  });

  assert.equal(typeof wrapped, "object");
  assert.ok(wrapped);
  assert.equal(typeof wrapped.info, "object");
  assert.ok(wrapped.info);
  assert.equal(wrapped.store, store);
  assert.equal(wrapped.info.enabled, false);
});
