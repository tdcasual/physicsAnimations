const logger = require("../logger");
const { createSqliteMirror, normalizeStateDbMode } = require("./sqliteMirror");
const { createStateDbCircuitState } = require("./circuitState");
const { createStateDbQueryFacade } = require("./queryFacade");
const { createStateDbWrappedStore } = require("./wrappedStore");
const {
  toInt,
  normalizeKey,
  isStateBlobKey,
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
  const normalizedMode = normalizeStateDbMode(mode ?? process.env.STATE_DB_MODE);
  if (normalizedMode !== "sqlite") {
    return { store, info: defaultStateDbInfo() };
  }

  const mirror = createSqliteMirror({ rootDir, dbPath: dbPath ?? process.env.STATE_DB_PATH });
  if (!mirror) {
    logger.warn("state_db_sqlite_unavailable", {
      mode: "sqlite",
      fallback: "disabled",
    });
    return { store, info: defaultStateDbInfo() };
  }

  const normalizedMaxErrors = Math.max(1, toInt(maxErrors ?? process.env.STATE_DB_MAX_ERRORS, 3));
  const normalizedCooldownMs = Math.max(1000, toInt(process.env.STATE_DB_COOLDOWN_MS, 30000));
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

  function circuitOpenError() {
    const err = new Error("state_db_circuit_open");
    err.code = "STATE_DB_CIRCUIT_OPEN";
    return err;
  }

  const circuitState = createStateDbCircuitState({
    info,
    logger,
    cooldownMs: normalizedCooldownMs,
  });

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

    let raw = null;
    let sourceReadError = null;
    try {
      raw = await store.readBuffer("items.json");
    } catch (err) {
      sourceReadError = err;
    }

    if (!raw && sourceReadError) {
      throw sourceReadError;
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

  const stateDbQuery = createStateDbQueryFacade({
    mirror,
    ensureDynamicItemsIndexed,
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
      setDynamicIndexedReady: (value) => {
        dynamicIndexedReady = Boolean(value);
      },
    },
  });

  return { store: wrappedStore, info };
}

module.exports = {
  createStateDbStore,
};
