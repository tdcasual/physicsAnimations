const logger = require("../logger");
const { createSqliteMirror, normalizeStateDbMode } = require("./sqliteMirror");
const { createStateDbCircuitState } = require("./circuitState");
const { createStateDbQueryFacade } = require("./queryFacade");
const { createStateDbWrappedStore } = require("./wrappedStore");
const {
  BUILTIN_ITEMS_STATE_KEY,
  toInt,
  normalizeKey,
  isStateBlobKey,
  getAnimationsSignature,
} = require("./mirrorHelpers");

function defaultStateDbInfo() {
  return {
    enabled: false,
    mode: "off",
    available: false,
    dbPath: "",
    healthy: false,
    degraded: false,
    circuitOpen: false,
    maxErrors: 0,
    errorCount: 0,
    consecutiveErrors: 0,
    lastError: "",
    lastErrorAt: "",
    lastSuccessAt: "",
  };
}

function createStateDbStore({ rootDir, store, mode, dbPath, maxErrors }) {
  const normalizedMode = normalizeStateDbMode(mode || process.env.STATE_DB_MODE);
  if (normalizedMode !== "sqlite") {
    return { store, info: defaultStateDbInfo() };
  }

  const mirror = createSqliteMirror({ rootDir, dbPath: dbPath || process.env.STATE_DB_PATH });
  if (!mirror) {
    logger.warn("state_db_sqlite_unavailable", {
      mode: "sqlite",
      fallback: "disabled",
    });
    return { store, info: defaultStateDbInfo() };
  }

  const normalizedMaxErrors = Math.max(1, toInt(maxErrors ?? process.env.STATE_DB_MAX_ERRORS, 3));
  const info = {
    enabled: true,
    mode: "sqlite",
    available: true,
    dbPath: mirror.dbPath,
    healthy: true,
    degraded: false,
    circuitOpen: false,
    maxErrors: normalizedMaxErrors,
    errorCount: 0,
    consecutiveErrors: 0,
    lastError: "",
    lastErrorAt: "",
    lastSuccessAt: "",
  };

  let dynamicIndexedReady = false;
  let builtinIndexedReady = false;
  let builtinOverridesDirty = true;
  let builtinAnimationsSignature = "";

  function circuitOpenError() {
    const err = new Error("state_db_circuit_open");
    err.code = "STATE_DB_CIRCUIT_OPEN";
    return err;
  }

  const circuitState = createStateDbCircuitState({ info, logger });

  function isUsable() {
    return circuitState.isUsable();
  }

  function ensureUsable() {
    if (!isUsable()) throw circuitOpenError();
  }

  function runMirrorOperation(operation, fn) {
    ensureUsable();
    try {
      const result = fn();
      circuitState.markSuccess();
      return result;
    } catch (err) {
      circuitState.markFailure(operation, err);
      throw err;
    }
  }

  async function ensureDynamicItemsIndexed() {
    if (dynamicIndexedReady) return;
    ensureUsable();

    let raw = runMirrorOperation("mirror.readBuffer(items.json)", () => mirror.readBuffer("items.json"));
    if (!raw) {
      raw = await store.readBuffer("items.json");
      if (raw) {
        runMirrorOperation("mirror.writeBuffer(items.json)", () => {
          mirror.writeBuffer("items.json", raw);
        });
      }
    }

    if (raw) {
      runMirrorOperation("mirror.syncDynamicItemsFromBuffer", () => {
        mirror.syncDynamicItemsFromBuffer(raw);
      });
    } else {
      runMirrorOperation("mirror.clearDynamicItems", () => {
        mirror.clearDynamicItems();
      });
    }

    dynamicIndexedReady = true;
  }

  async function ensureBuiltinItemsIndexed() {
    const animationsSignature = getAnimationsSignature({ rootDir });
    if (builtinIndexedReady && !builtinOverridesDirty && animationsSignature === builtinAnimationsSignature) {
      return;
    }

    ensureUsable();

    let raw = runMirrorOperation(`mirror.readBuffer(${BUILTIN_ITEMS_STATE_KEY})`, () =>
      mirror.readBuffer(BUILTIN_ITEMS_STATE_KEY),
    );

    if (!raw) {
      raw = await store.readBuffer(BUILTIN_ITEMS_STATE_KEY);
      if (raw) {
        runMirrorOperation(`mirror.writeBuffer(${BUILTIN_ITEMS_STATE_KEY})`, () => {
          mirror.writeBuffer(BUILTIN_ITEMS_STATE_KEY, raw);
        });
      }
    }

    runMirrorOperation("mirror.syncBuiltinItems", () => {
      mirror.syncBuiltinItems({ rootDir, builtinOverridesBuffer: raw });
    });

    builtinIndexedReady = true;
    builtinOverridesDirty = false;
    builtinAnimationsSignature = animationsSignature;
  }

  const stateDbQuery = createStateDbQueryFacade({
    mirror,
    ensureDynamicItemsIndexed,
    ensureBuiltinItemsIndexed,
    runMirrorOperation,
    ensureUsable,
  });

  const wrappedStore = createStateDbWrappedStore({
    store,
    info,
    stateDbQuery,
    mirrorOps: {
      isStateBlobKey,
      normalizeKey,
      isUsable,
      runMirrorOperation,
      mirror,
      rootDir,
      BUILTIN_ITEMS_STATE_KEY,
      getAnimationsSignature,
      getDynamicIndexedReady: () => dynamicIndexedReady,
      setDynamicIndexedReady: (value) => {
        dynamicIndexedReady = Boolean(value);
      },
      getBuiltinIndexedReady: () => builtinIndexedReady,
      setBuiltinIndexedReady: (value) => {
        builtinIndexedReady = Boolean(value);
      },
      getBuiltinOverridesDirty: () => builtinOverridesDirty,
      setBuiltinOverridesDirty: (value) => {
        builtinOverridesDirty = Boolean(value);
      },
      setBuiltinAnimationsSignature: (value) => {
        builtinAnimationsSignature = String(value || "");
      },
    },
  });

  return { store: wrappedStore, info };
}

module.exports = {
  createStateDbStore,
};
