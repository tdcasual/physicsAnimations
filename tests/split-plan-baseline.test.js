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
    "cancelEmbedProfileSync",
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
    "rollbackEmbedProfile",
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

test("createStateDbStore explicit empty mode does not fall through to env mode", () => {
  const prevMode = process.env.STATE_DB_MODE;
  process.env.STATE_DB_MODE = "sqlite";
  try {
    const wrapped = createStateDbStore({
      rootDir: process.cwd(),
      store: createStoreStub(),
      mode: "",
    });
    assert.equal(wrapped.info.enabled, false);
  } finally {
    if (prevMode === undefined) delete process.env.STATE_DB_MODE;
    else process.env.STATE_DB_MODE = prevMode;
  }
});
