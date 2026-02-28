const { Readable } = require("stream");

function createStateDbWrappedStore({ store, info, stateDbQuery, mirrorOps }) {
  const {
    isStateBlobKey,
    normalizeKey,
    isUsable,
    runMirrorOperation,
    mirror,
    rootDir,
    BUILTIN_ITEMS_STATE_KEY,
    getAnimationsSignature,
    getDynamicIndexedReady,
    setDynamicIndexedReady,
    getBuiltinIndexedReady,
    setBuiltinIndexedReady,
    setBuiltinOverridesDirty,
    setBuiltinAnimationsSignature,
  } = mirrorOps;

  return {
    get mode() {
      return store.mode;
    },
    get readOnly() {
      return Boolean(store.readOnly);
    },
    get baseDir() {
      return store.baseDir;
    },
    get baseUrl() {
      return store.baseUrl;
    },
    get basePath() {
      return store.basePath;
    },
    get local() {
      return store.local;
    },
    get webdav() {
      return store.webdav;
    },
    get stateDb() {
      return info;
    },
    get stateDbQuery() {
      return stateDbQuery;
    },

    async readBuffer(key) {
      const normalizedKey = normalizeKey(key);
      if (!isStateBlobKey(normalizedKey)) {
        return store.readBuffer(normalizedKey);
      }

      if (!isUsable()) {
        return store.readBuffer(normalizedKey);
      }

      let cached = null;
      try {
        cached = runMirrorOperation(`mirror.readBuffer(${normalizedKey})`, () => mirror.readBuffer(normalizedKey));
      } catch {
        return store.readBuffer(normalizedKey);
      }

      if (cached) {
        if (normalizedKey === "items.json" && !getDynamicIndexedReady() && isUsable()) {
          try {
            runMirrorOperation("mirror.syncDynamicItemsFromBuffer(cache)", () => {
              mirror.syncDynamicItemsFromBuffer(cached);
            });
            setDynamicIndexedReady(true);
          } catch {
          }
        }
        if (normalizedKey === BUILTIN_ITEMS_STATE_KEY && !getBuiltinIndexedReady() && isUsable()) {
          try {
            runMirrorOperation("mirror.syncBuiltinItems(cache)", () => {
              mirror.syncBuiltinItems({ rootDir, builtinOverridesBuffer: cached });
            });
            setBuiltinIndexedReady(true);
            setBuiltinOverridesDirty(false);
            setBuiltinAnimationsSignature(getAnimationsSignature({ rootDir }));
          } catch {
            setBuiltinOverridesDirty(true);
          }
        }
        return cached;
      }

      const raw = await store.readBuffer(normalizedKey);
      if (raw && isUsable()) {
        try {
          runMirrorOperation(`mirror.writeBuffer(${normalizedKey})`, () => {
            mirror.writeBuffer(normalizedKey, raw);
          });

          if (normalizedKey === "items.json") {
            runMirrorOperation("mirror.syncDynamicItemsFromBuffer(readThrough)", () => {
              mirror.syncDynamicItemsFromBuffer(raw);
            });
            setDynamicIndexedReady(true);
          }

          if (normalizedKey === BUILTIN_ITEMS_STATE_KEY) {
            runMirrorOperation("mirror.syncBuiltinItems(readThrough)", () => {
              mirror.syncBuiltinItems({ rootDir, builtinOverridesBuffer: raw });
            });
            setBuiltinIndexedReady(true);
            setBuiltinOverridesDirty(false);
            setBuiltinAnimationsSignature(getAnimationsSignature({ rootDir }));
          }
        } catch {
          if (normalizedKey === BUILTIN_ITEMS_STATE_KEY) {
            setBuiltinOverridesDirty(true);
          }
        }
      }

      return raw;
    },

    async writeBuffer(key, buffer, options) {
      const normalizedKey = normalizeKey(key);
      await store.writeBuffer(normalizedKey, buffer, options);
      if (!isStateBlobKey(normalizedKey) || !isUsable()) return;

      try {
        runMirrorOperation(`mirror.writeBuffer(${normalizedKey})`, () => {
          mirror.writeBuffer(normalizedKey, buffer);
        });

        if (normalizedKey === "items.json") {
          runMirrorOperation("mirror.syncDynamicItemsFromBuffer(write)", () => {
            mirror.syncDynamicItemsFromBuffer(buffer);
          });
          setDynamicIndexedReady(true);
        }

        if (normalizedKey === BUILTIN_ITEMS_STATE_KEY) {
          runMirrorOperation("mirror.syncBuiltinItems(write)", () => {
            mirror.syncBuiltinItems({ rootDir, builtinOverridesBuffer: buffer });
          });
          setBuiltinIndexedReady(true);
          setBuiltinOverridesDirty(false);
          setBuiltinAnimationsSignature(getAnimationsSignature({ rootDir }));
        }
      } catch {
        if (normalizedKey === BUILTIN_ITEMS_STATE_KEY) {
          setBuiltinOverridesDirty(true);
        }
      }
    },

    async deletePath(key, options) {
      const normalizedKey = normalizeKey(key);
      await store.deletePath(normalizedKey, options);
      if (!isStateBlobKey(normalizedKey) || !isUsable()) return;

      try {
        runMirrorOperation(`mirror.deletePath(${normalizedKey})`, () => {
          mirror.deletePath(normalizedKey);
        });

        if (normalizedKey === "items.json") {
          runMirrorOperation("mirror.clearDynamicItems(delete)", () => {
            mirror.clearDynamicItems();
          });
          setDynamicIndexedReady(true);
        }

        if (normalizedKey === BUILTIN_ITEMS_STATE_KEY) {
          runMirrorOperation("mirror.syncBuiltinItems(delete)", () => {
            mirror.syncBuiltinItems({ rootDir, builtinOverridesBuffer: null });
          });
          setBuiltinIndexedReady(true);
          setBuiltinOverridesDirty(false);
          setBuiltinAnimationsSignature(getAnimationsSignature({ rootDir }));
        }
      } catch {
        if (normalizedKey === BUILTIN_ITEMS_STATE_KEY) {
          setBuiltinOverridesDirty(true);
        }
      }
    },

    async createReadStream(key) {
      const normalizedKey = normalizeKey(key);
      if (!isStateBlobKey(normalizedKey)) return store.createReadStream(normalizedKey);
      if (!isUsable()) return store.createReadStream(normalizedKey);

      try {
        const cached = runMirrorOperation(`mirror.readBuffer(${normalizedKey})`, () =>
          mirror.readBuffer(normalizedKey),
        );
        if (cached) {
          return Readable.from([cached]);
        }
      } catch {
      }

      return store.createReadStream(normalizedKey);
    },
  };
}

module.exports = {
  createStateDbWrappedStore,
};
