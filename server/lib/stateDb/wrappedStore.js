const { Readable } = require("stream");

function createStateDbWrappedStore({ store, info, stateDbQuery, mirrorOps }) {
  const {
    isStateBlobKey,
    normalizeKey,
    isUsable,
    runMirrorOperation,
    mirror,
    setDynamicIndexedReady,
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

      let raw = null;
      let sourceError = null;
      try {
        raw = await store.readBuffer(normalizedKey);
      } catch (err) {
        sourceError = err;
      }

      if (raw) {
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
        } catch {
          if (normalizedKey === "items.json") {
            setDynamicIndexedReady(false);
          }
        }
        return raw;
      }

      if (!sourceError) {
        return null;
      }
      throw sourceError;
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
      } catch {
        if (normalizedKey === "items.json") {
          setDynamicIndexedReady(false);
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
      } catch {
        if (normalizedKey === "items.json") {
          setDynamicIndexedReady(false);
        }
      }
    },

    async createReadStream(key) {
      const normalizedKey = normalizeKey(key);
      if (!isStateBlobKey(normalizedKey)) return store.createReadStream(normalizedKey);
      if (!isUsable()) return store.createReadStream(normalizedKey);
      const raw = await this.readBuffer(normalizedKey);
      if (!raw) return null;
      return Readable.from([raw]);
    },
  };
}

module.exports = {
  createStateDbWrappedStore,
};
