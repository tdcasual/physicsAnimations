const test = require("node:test");
const assert = require("node:assert/strict");

const { createAdapterRegistry } = require("../server/services/library/adapters/registry");
const { createGeogebraAdapter } = require("../server/services/library/adapters/geogebra");
const { createPhETAdapter } = require("../server/services/library/adapters/phet");
const { createLibraryService } = require("../server/services/library/libraryService");

function createTestAdapterRegistry() {
  return createAdapterRegistry([createGeogebraAdapter(), createPhETAdapter()]);
}

function createFolderState() {
  return {
    folders: [
      {
        id: "f_1",
        name: "Folder",
        categoryId: "other",
        coverType: "blank",
        coverPath: "",
        parentId: null,
        order: 0,
        createdAt: "",
        updatedAt: "",
      },
    ],
  };
}

test("uploadFolderCover cleans up written cover file when folder state write fails", async () => {
  const deleteCalls = [];
  const writeCalls = [];
  const foldersState = createFolderState();

  const store = {
    async readBuffer() {
      return null;
    },
    async writeBuffer(key) {
      writeCalls.push(key);
    },
    async deletePath(key, options = {}) {
      deleteCalls.push({ key, options });
    },
  };

  const service = createLibraryService({
    store,
    deps: {
      loadLibraryFoldersState: async () => foldersState,
      mutateLibraryFoldersState: async () => {
        throw new Error("folders_state_write_failed");
      },
      loadLibraryAssetsState: async () => ({ assets: [] }),
      mutateLibraryAssetsState: async () => {},
      loadLibraryEmbedProfilesState: async () => ({ profiles: [] }),
      mutateLibraryEmbedProfilesState: async () => {},
    },
  });

  await assert.rejects(
    () =>
      service.uploadFolderCover({
        folderId: "f_1",
        fileBuffer: Buffer.from("PNGDATA"),
        originalName: "cover.png",
        mimeType: "image/png",
      }),
    (err) => err && err.message === "folders_state_write_failed",
  );

  assert.equal(writeCalls.length, 1);
  assert.equal(deleteCalls.length, 1);
  assert.equal(deleteCalls[0].key, writeCalls[0]);
});

test("uploadAsset cleans up uploaded files when assets state write fails", async () => {
  const deleteCalls = [];
  const writeCalls = [];
  const foldersState = createFolderState();

  const store = {
    async readBuffer() {
      return null;
    },
    async writeBuffer(key) {
      writeCalls.push(key);
    },
    async deletePath(key, options = {}) {
      deleteCalls.push({ key, options });
    },
  };

  const service = createLibraryService({
    store,
    deps: {
      adapterRegistry: createTestAdapterRegistry(),
      loadLibraryFoldersState: async () => foldersState,
      mutateLibraryFoldersState: async (_ctx, mutator) => mutator(foldersState),
      loadLibraryAssetsState: async () => ({ assets: [] }),
      mutateLibraryAssetsState: async () => {
        throw new Error("assets_state_write_failed");
      },
      loadLibraryEmbedProfilesState: async () => ({ profiles: [] }),
      mutateLibraryEmbedProfilesState: async () => {},
    },
  });

  await assert.rejects(
    () =>
      service.uploadAsset({
        folderId: "f_1",
        fileBuffer: Buffer.from("GGBDATA"),
        originalName: "demo.ggb",
        openMode: "download",
      }),
    (err) => err && err.message === "assets_state_write_failed",
  );

  assert.equal(writeCalls.length >= 1, true);
  assert.equal(deleteCalls.length, 1);
  assert.match(deleteCalls[0].key, /^library\/assets\/a_/);
  assert.equal(deleteCalls[0].options.recursive, true);
});
