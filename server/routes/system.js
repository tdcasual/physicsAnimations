const express = require("express");

const { requireAuth } = require("../lib/auth");
const { loadSystemState, mutateSystemState, normalizeMode, noSave } = require("../lib/systemState");
const { syncLocalToWebdav } = require("../lib/webdavSync");

function createSystemRouter({ authConfig, store, rootDir, updateStoreConfig }) {
  const router = express.Router();
  const authRequired = requireAuth({ authConfig });

  router.get("/system", authRequired, (_req, res) => {
    const state = loadSystemState({ rootDir });
    const effectiveMode = store?.mode || "local";
    const webdav = state.storage.webdav || {};

    res.json({
      auth: {
        jwtSecretSource: authConfig?.jwtSecretSource || "unknown",
        jwtSecretFromEnv: Boolean(process.env.JWT_SECRET),
        adminUsernameFromEnv: Boolean(process.env.ADMIN_USERNAME),
        adminPasswordConfigured: Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD),
      },
      storage: {
        mode: state.storage.mode,
        effectiveMode,
        readOnly: Boolean(store?.readOnly),
        localPath: `${rootDir}/content`,
        lastSyncedAt: state.storage.lastSyncedAt || "",
        webdav: {
          url: webdav.url || "",
          basePath: webdav.basePath || "physicsAnimations",
          username: webdav.username || "",
          timeoutMs: Number.isFinite(webdav.timeoutMs) ? webdav.timeoutMs : 15000,
          hasPassword: Boolean(webdav.password),
          configured: Boolean(webdav.url),
        },
      },
    });
  });

  router.post("/system/storage", authRequired, async (req, res, next) => {
    try {
      const payload = req.body || {};
      const rawMode = typeof payload.mode === "string" ? payload.mode : "";
      const requestedMode = normalizeMode(rawMode);
      const sync = payload.sync === true;

      const updateResult = await mutateSystemState({ rootDir }, (state) => {
        const nextStorage = { ...(state.storage || {}) };
        const nextWebdav = { ...(nextStorage.webdav || {}) };
        if (requestedMode) {
          nextStorage.mode = requestedMode;
        }

        if (payload.webdav && typeof payload.webdav === "object") {
          const incoming = payload.webdav;
          if (typeof incoming.url === "string") nextWebdav.url = incoming.url.trim();
          if (typeof incoming.basePath === "string") {
            nextWebdav.basePath = incoming.basePath.trim() || "physicsAnimations";
          }
          if (typeof incoming.username === "string") nextWebdav.username = incoming.username.trim();
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
        }

        const mode = nextStorage.mode || "local";
        if ((mode === "webdav" || mode === "hybrid") && !nextWebdav.url) {
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

      if (typeof updateStoreConfig === "function") {
        updateStoreConfig(nextState);
      }

      let syncResult = null;
      if (sync && webdav.url) {
        syncResult = await syncLocalToWebdav({ rootDir, webdavConfig: webdav });
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
        storage: {
          mode: refreshed.storage.mode,
          effectiveMode: store?.mode || "local",
          localPath: `${rootDir}/content`,
          lastSyncedAt: refreshed.storage.lastSyncedAt || "",
          webdav: {
            url: refreshed.storage.webdav.url || "",
            basePath: refreshed.storage.webdav.basePath || "physicsAnimations",
            username: refreshed.storage.webdav.username || "",
            timeoutMs: Number.isFinite(refreshed.storage.webdav.timeoutMs)
              ? refreshed.storage.webdav.timeoutMs
              : 15000,
            hasPassword: Boolean(refreshed.storage.webdav.password),
            configured: Boolean(refreshed.storage.webdav.url),
          },
        },
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
