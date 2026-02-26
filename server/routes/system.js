const express = require("express");

const { requireAuth } = require("../lib/auth");
const { createWebdavStore } = require("../lib/contentStore");
const { loadSystemState, mutateSystemState, normalizeMode, noSave } = require("../lib/systemState");
const { syncWithWebdav } = require("../lib/webdavSync");

function applyIncomingWebdav(current, incoming) {
  const nextWebdav = { ...(current || {}) };
  if (!incoming || typeof incoming !== "object") return nextWebdav;

  if (typeof incoming.url === "string") nextWebdav.url = incoming.url.trim();
  if (typeof incoming.basePath === "string") {
    nextWebdav.basePath = incoming.basePath.trim() || "physicsAnimations";
  }
  if (typeof incoming.username === "string") nextWebdav.username = incoming.username.trim();
  if (typeof incoming.scanRemote === "boolean") nextWebdav.scanRemote = incoming.scanRemote;
  if (typeof incoming.password === "string" && incoming.password) {
    nextWebdav.password = incoming.password;
  }

  if (Number.isFinite(incoming.timeoutMs)) {
    nextWebdav.timeoutMs = Math.max(1000, Math.trunc(incoming.timeoutMs));
  }
  if (typeof incoming.timeoutMs === "string" && incoming.timeoutMs.trim()) {
    const parsed = Number.parseInt(incoming.timeoutMs.trim(), 10);
    if (Number.isFinite(parsed)) nextWebdav.timeoutMs = Math.max(1000, parsed);
  }

  return nextWebdav;
}

function toStorageResponse({ state, store, rootDir }) {
  const webdav = state.storage.webdav || {};
  return {
    mode: state.storage.mode,
    effectiveMode: store?.mode || "local",
    readOnly: Boolean(store?.readOnly),
    stateDb: store?.stateDb || {
      enabled: false,
      mode: "off",
      available: false,
      dbPath: "",
    },
    localPath: `${rootDir}/content`,
    lastSyncedAt: state.storage.lastSyncedAt || "",
    webdav: {
      url: webdav.url || "",
      basePath: webdav.basePath || "physicsAnimations",
      username: webdav.username || "",
      timeoutMs: Number.isFinite(webdav.timeoutMs) ? webdav.timeoutMs : 15000,
      hasPassword: Boolean(webdav.password),
      configured: Boolean(webdav.url),
      scanRemote: webdav.scanRemote === true,
    },
  };
}

function isRemoteMode(mode) {
  return mode === "webdav" || mode === "hybrid";
}

function createSystemRouter({ authConfig, store, taskQueue, rootDir, updateStoreConfig }) {
  const router = express.Router();
  const authRequired = requireAuth({ authConfig });

  router.get("/system", authRequired, (_req, res) => {
    const state = loadSystemState({ rootDir });

    res.json({
      auth: {
        jwtSecretSource: authConfig?.jwtSecretSource || "unknown",
        jwtSecretFromEnv: Boolean(process.env.JWT_SECRET),
        adminUsernameFromEnv: Boolean(process.env.ADMIN_USERNAME),
        adminPasswordConfigured: Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD),
      },
      storage: toStorageResponse({ state, store, rootDir }),
      taskQueue: typeof taskQueue?.getStats === "function" ? taskQueue.getStats() : null,
    });
  });

  router.post("/system/storage/validate", authRequired, async (req, res) => {
    const payload = req.body || {};
    const state = loadSystemState({ rootDir });
    const baseWebdav = state.storage?.webdav || {};
    const nextWebdav = applyIncomingWebdav(baseWebdav, payload.webdav);
    if (!nextWebdav.url) {
      res.status(400).json({ error: "webdav_missing_url" });
      return;
    }

    try {
      const webdav = createWebdavStore(nextWebdav);
      await webdav.listDir("", { depth: 0 });
      res.json({ ok: true });
    } catch (err) {
      const message = String(err?.message || "webdav_connect_failed");
      res.status(502).json({
        error: "webdav_connect_failed",
        reason: message,
      });
    }
  });

  router.post("/system/storage", authRequired, async (req, res, next) => {
    try {
      const payload = req.body || {};
      const rawMode = typeof payload.mode === "string" ? payload.mode : "";
      const requestedMode = normalizeMode(rawMode);
      const sync = payload.sync === true;

      const updateResult = await mutateSystemState({ rootDir }, (state) => {
        const nextStorage = { ...(state.storage || {}) };
        const nextWebdav = applyIncomingWebdav(nextStorage.webdav || {}, payload.webdav);
        if (requestedMode) {
          nextStorage.mode = requestedMode;
        }

        const mode = nextStorage.mode || "local";
        if (isRemoteMode(mode) && !nextWebdav.url) {
          return noSave({ error: "webdav_missing_url" });
        }

        state.storage = {
          ...nextStorage,
          webdav: nextWebdav,
        };
        return { state };
      });

      if (updateResult?.error) {
        res.status(400).json({ error: updateResult.error });
        return;
      }

      const nextState = loadSystemState({ rootDir });
      const webdav = nextState.storage.webdav || {};
      const nextMode = nextState.storage.mode || "local";

      if (typeof updateStoreConfig === "function") {
        updateStoreConfig(nextState);
      }

      let syncResult = null;
      if (sync && isRemoteMode(nextMode) && webdav.url) {
        syncResult = await syncWithWebdav({
          rootDir,
          webdavConfig: webdav,
          scanRemote: webdav.scanRemote === true,
        });
        await mutateSystemState({ rootDir }, (state) => {
          if (!state.storage) state.storage = {};
          state.storage.lastSyncedAt = new Date().toISOString();
          return state;
        });
      }

      const refreshed = loadSystemState({ rootDir });
      res.json({
        ok: true,
        sync: syncResult,
        storage: toStorageResponse({ state: refreshed, store, rootDir }),
        taskQueue: typeof taskQueue?.getStats === "function" ? taskQueue.getStats() : null,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = {
  createSystemRouter,
};
