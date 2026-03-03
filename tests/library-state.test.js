const test = require("node:test");
const assert = require("node:assert/strict");

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
  };
}

test("libraryState exposes folders and assets helpers", async () => {
  const mod = require("../server/lib/libraryState");

  assert.equal(typeof mod.LIBRARY_FOLDERS_KEY, "string");
  assert.equal(typeof mod.LIBRARY_ASSETS_KEY, "string");
  assert.equal(typeof mod.LIBRARY_EMBED_PROFILES_KEY, "string");
  assert.equal(typeof mod.loadLibraryFoldersState, "function");
  assert.equal(typeof mod.saveLibraryFoldersState, "function");
  assert.equal(typeof mod.mutateLibraryFoldersState, "function");
  assert.equal(typeof mod.loadLibraryAssetsState, "function");
  assert.equal(typeof mod.saveLibraryAssetsState, "function");
  assert.equal(typeof mod.mutateLibraryAssetsState, "function");
  assert.equal(typeof mod.loadLibraryEmbedProfilesState, "function");
  assert.equal(typeof mod.saveLibraryEmbedProfilesState, "function");
  assert.equal(typeof mod.mutateLibraryEmbedProfilesState, "function");
});

test("libraryState loads empty defaults when files are missing", async () => {
  const {
    loadLibraryFoldersState,
    loadLibraryAssetsState,
    loadLibraryEmbedProfilesState,
  } = require("../server/lib/libraryState");
  const store = createMemoryStore();

  const folders = await loadLibraryFoldersState({ store });
  const assets = await loadLibraryAssetsState({ store });
  const profiles = await loadLibraryEmbedProfilesState({ store });

  assert.deepEqual(folders, { version: 1, folders: [] });
  assert.deepEqual(assets, { version: 1, assets: [] });
  assert.deepEqual(profiles, { version: 1, profiles: [] });
});

test("libraryState saves and reloads sanitized folders/assets payload", async () => {
  const {
    loadLibraryFoldersState,
    saveLibraryFoldersState,
    loadLibraryAssetsState,
    saveLibraryAssetsState,
    loadLibraryEmbedProfilesState,
    saveLibraryEmbedProfilesState,
  } = require("../server/lib/libraryState");
  const store = createMemoryStore();

  await saveLibraryFoldersState({
    store,
    state: {
      version: 99,
      folders: [
        { id: "f1", name: "Folder", coverType: "image", coverPath: "x", parentId: null },
        { id: "", name: "Invalid" },
      ],
    },
  });
  await saveLibraryAssetsState({
    store,
    state: {
      assets: [
        {
          id: "a1",
          folderId: "f1",
          adapterKey: "geogebra",
          displayName: "演示名称",
          fileName: "demo.ggb",
          filePath: "content/library/assets/a1/source/demo.ggb",
          fileSize: 123,
          openMode: "embed",
          generatedEntryPath: "content/library/assets/a1/viewer/index.html",
          embedProfileId: "ep_1",
          embedOptions: { mode: "view" },
          status: "ready",
        },
        { id: "" },
      ],
    },
  });
  await saveLibraryEmbedProfilesState({
    store,
    state: {
      profiles: [
        {
          id: "ep_1",
          name: "电场",
          scriptUrl: "https://field.infinitas.fun/embed/embed.js",
          viewerPath: "https://field.infinitas.fun/embed/viewer.html",
          constructorName: "ElectricFieldApp",
          assetUrlOptionKey: "sceneUrl",
          matchExtensions: ["json"],
          defaultOptions: { mode: "view" },
          enabled: true,
        },
        { id: "" },
      ],
    },
  });

  const folders = await loadLibraryFoldersState({ store });
  const assets = await loadLibraryAssetsState({ store });
  const profiles = await loadLibraryEmbedProfilesState({ store });

  assert.equal(folders.version, 1);
  assert.equal(folders.folders.length, 1);
  assert.equal(folders.folders[0].id, "f1");
  assert.equal(assets.version, 1);
  assert.equal(assets.assets.length, 1);
  assert.equal(assets.assets[0].id, "a1");
  assert.equal(assets.assets[0].displayName, "演示名称");
  assert.equal(assets.assets[0].embedProfileId, "ep_1");
  assert.deepEqual(assets.assets[0].embedOptions, { mode: "view" });
  assert.equal(profiles.version, 1);
  assert.equal(profiles.profiles.length, 1);
  assert.equal(profiles.profiles[0].id, "ep_1");
  assert.equal(Object.prototype.hasOwnProperty.call(profiles.profiles[0], "syncMode"), false);
});

test("libraryState mutate helpers persist updates", async () => {
  const {
    loadLibraryFoldersState,
    mutateLibraryFoldersState,
    loadLibraryAssetsState,
    mutateLibraryAssetsState,
    loadLibraryEmbedProfilesState,
    mutateLibraryEmbedProfilesState,
  } = require("../server/lib/libraryState");
  const store = createMemoryStore();

  await mutateLibraryFoldersState({ store }, (state) => {
    state.folders.push({ id: "f1", name: "Folder 1" });
  });
  await mutateLibraryAssetsState({ store }, (state) => {
    state.assets.push({ id: "a1", folderId: "f1", adapterKey: "geogebra", fileName: "demo.ggb", openMode: "embed" });
  });
  await mutateLibraryEmbedProfilesState({ store }, (state) => {
    state.profiles.push({ id: "ep_1", name: "Embed" });
  });

  const folders = await loadLibraryFoldersState({ store });
  const assets = await loadLibraryAssetsState({ store });
  const profiles = await loadLibraryEmbedProfilesState({ store });

  assert.equal(folders.folders.length, 1);
  assert.equal(folders.folders[0].id, "f1");
  assert.equal(assets.assets.length, 1);
  assert.equal(assets.assets[0].id, "a1");
  assert.equal(assets.assets[0].openMode, "embed");
  assert.equal(profiles.profiles.length, 1);
  assert.equal(profiles.profiles[0].id, "ep_1");
});

test("libraryState sanitizers strip prototype-pollution keys in json option fields", async () => {
  const {
    saveLibraryAssetsState,
    loadLibraryAssetsState,
    saveLibraryEmbedProfilesState,
    loadLibraryEmbedProfilesState,
  } = require("../server/lib/libraryState");
  const store = createMemoryStore();

  await saveLibraryAssetsState({
    store,
    state: {
      assets: [
        {
          id: "a_pp",
          folderId: "f1",
          adapterKey: "embed:ep_1",
          fileName: "scene.json",
          filePath: "content/library/assets/a_pp/source/scene.json",
          openMode: "embed",
          embedOptions: JSON.parse('{"__proto__":{"polluted":true},"safe":1}'),
        },
      ],
    },
  });

  await saveLibraryEmbedProfilesState({
    store,
    state: {
      profiles: [
        {
          id: "ep_pp",
          name: "Safe",
          scriptUrl: "/content/library/vendor/x/embed.js",
          viewerPath: "/content/library/vendor/x/viewer.html",
          defaultOptions: JSON.parse('{"constructor":{"prototype":{"x":1}},"ok":1}'),
        },
      ],
    },
  });

  const assets = await loadLibraryAssetsState({ store });
  const profiles = await loadLibraryEmbedProfilesState({ store });
  const embedOptions = assets.assets[0].embedOptions;
  const defaultOptions = profiles.profiles[0].defaultOptions;

  assert.equal(embedOptions.safe, 1);
  assert.equal(embedOptions.polluted, undefined);
  assert.equal(Object.getPrototypeOf(embedOptions).polluted, undefined);

  assert.equal(defaultOptions.ok, 1);
  assert.equal(defaultOptions.x, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(defaultOptions, "constructor"), false);
});
