const {
  LIBRARY_STATE_VERSION,
  normalizeFoldersPayload,
  normalizeAssetsPayload,
  normalizeEmbedProfilesPayload,
} = require("./libraryState/normalizers");

const LIBRARY_FOLDERS_KEY = "library/folders.json";
const LIBRARY_ASSETS_KEY = "library/assets.json";
const LIBRARY_EMBED_PROFILES_KEY = "library/embed-profiles.json";

const stateLocks = new Map();

async function withStateLock(key, fn) {
  const previous = stateLocks.get(key) || Promise.resolve();
  let release = () => {};
  const current = new Promise((resolve) => {
    release = resolve;
  });
  stateLocks.set(key, current);

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (stateLocks.get(key) === current) stateLocks.delete(key);
  }
}

async function loadState({ store, key, normalize, emptyFactory }) {
  const raw = await store.readBuffer(key);
  if (!raw) return emptyFactory();

  let parsed = null;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return emptyFactory();
  }

  return normalize(parsed);
}

async function saveState({ store, key, state, normalize }) {
  const normalized = normalize(state);
  const json = Buffer.from(`${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await store.writeBuffer(key, json, { contentType: "application/json; charset=utf-8" });
}

function createStateMutator({ key, load, save }) {
  return async function mutateState({ store }, mutator) {
    return withStateLock(key, async () => {
      const state = await load({ store });
      const result = await mutator(state);
      await save({ store, state });
      return result;
    });
  };
}

function createVersionedListEmptyFactory(listKey) {
  return () => ({ version: LIBRARY_STATE_VERSION, [listKey]: [] });
}

async function loadLibraryFoldersState({ store }) {
  return loadState({
    store,
    key: LIBRARY_FOLDERS_KEY,
    normalize: normalizeFoldersPayload,
    emptyFactory: createVersionedListEmptyFactory("folders"),
  });
}

async function saveLibraryFoldersState({ store, state }) {
  return saveState({
    store,
    key: LIBRARY_FOLDERS_KEY,
    state,
    normalize: normalizeFoldersPayload,
  });
}

const mutateLibraryFoldersState = createStateMutator({
  key: LIBRARY_FOLDERS_KEY,
  load: loadLibraryFoldersState,
  save: saveLibraryFoldersState,
});

async function loadLibraryAssetsState({ store }) {
  return loadState({
    store,
    key: LIBRARY_ASSETS_KEY,
    normalize: normalizeAssetsPayload,
    emptyFactory: createVersionedListEmptyFactory("assets"),
  });
}

async function saveLibraryAssetsState({ store, state }) {
  return saveState({
    store,
    key: LIBRARY_ASSETS_KEY,
    state,
    normalize: normalizeAssetsPayload,
  });
}

const mutateLibraryAssetsState = createStateMutator({
  key: LIBRARY_ASSETS_KEY,
  load: loadLibraryAssetsState,
  save: saveLibraryAssetsState,
});

async function loadLibraryEmbedProfilesState({ store }) {
  return loadState({
    store,
    key: LIBRARY_EMBED_PROFILES_KEY,
    normalize: normalizeEmbedProfilesPayload,
    emptyFactory: createVersionedListEmptyFactory("profiles"),
  });
}

async function saveLibraryEmbedProfilesState({ store, state }) {
  return saveState({
    store,
    key: LIBRARY_EMBED_PROFILES_KEY,
    state,
    normalize: normalizeEmbedProfilesPayload,
  });
}

const mutateLibraryEmbedProfilesState = createStateMutator({
  key: LIBRARY_EMBED_PROFILES_KEY,
  load: loadLibraryEmbedProfilesState,
  save: saveLibraryEmbedProfilesState,
});

module.exports = {
  LIBRARY_FOLDERS_KEY,
  LIBRARY_ASSETS_KEY,
  LIBRARY_EMBED_PROFILES_KEY,
  loadLibraryFoldersState,
  saveLibraryFoldersState,
  mutateLibraryFoldersState,
  loadLibraryAssetsState,
  saveLibraryAssetsState,
  mutateLibraryAssetsState,
  loadLibraryEmbedProfilesState,
  saveLibraryEmbedProfilesState,
  mutateLibraryEmbedProfilesState,
};
