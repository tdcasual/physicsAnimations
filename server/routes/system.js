const express = require("express");

const { requireAuth } = require("../lib/auth");
const { logAdminAudit } = require("../lib/auditLogger");
const { createWebdavStore } = require("../lib/contentStore");
const {
  DEFAULT_EMBED_UPDATER_INTERVAL_DAYS,
  MAX_EMBED_UPDATER_INTERVAL_DAYS,
  MIN_EMBED_UPDATER_INTERVAL_DAYS,
  getEmbedUpdaterNextRunAt,
  loadSystemState,
  mutateSystemState,
  normalizeEmbedUpdaterIntervalDays,
  normalizeMode,
  noSave,
} = require("../lib/systemState");
const { syncWithWebdav } = require("../lib/webdavSync");
const { assertPublicHttpUrl } = require("../lib/ssrf");

function applyIncomingWebdav(current, incoming) {
  const nextWebdav = { ...(current || {}) };
  if (!incoming || typeof incoming !== "object") return nextWebdav;

  if (typeof incoming.url === "string") nextWebdav.url = incoming.url.trim();
  if (typeof incoming.basePath === "string") {
    nextWebdav.basePath = incoming.basePath.trim() || "physicsAnimations";
  }
  if (typeof incoming.username === "string") nextWebdav.username = incoming.username.trim();
  if (typeof incoming.scanRemote === "boolean") nextWebdav.scanRemote = incoming.scanRemote;
  if (typeof incoming.password === "string") {
    nextWebdav.password = incoming.password;
  }

  if (Number.isFinite(incoming.timeoutMs)) {
    nextWebdav.timeoutMs = Math.max(1000, Math.trunc(incoming.timeoutMs));
  }
  if (typeof incoming.timeoutMs === "string" && incoming.timeoutMs.trim()) {
    const rawTimeout = incoming.timeoutMs.trim();
    if (/^\d+$/.test(rawTimeout)) {
      const parsed = Number.parseInt(rawTimeout, 10);
      if (Number.isFinite(parsed)) nextWebdav.timeoutMs = Math.max(1000, parsed);
    }
  }

  return nextWebdav;
}

function parseEmbedUpdaterIntervalDays(value) {
  if (value === undefined) return { ok: true, value: undefined };

  let parsed = null;
  if (typeof value === "number") {
    parsed = Number.isFinite(value) ? Math.trunc(value) : null;
  } else if (typeof value === "string") {
    const raw = value.trim();
    if (/^\d+$/.test(raw)) parsed = Number.parseInt(raw, 10);
  }

  if (!Number.isFinite(parsed)) {
    return { ok: false, error: "invalid_embed_updater_interval_days" };
  }
  if (parsed < MIN_EMBED_UPDATER_INTERVAL_DAYS || parsed > MAX_EMBED_UPDATER_INTERVAL_DAYS) {
    return { ok: false, error: "invalid_embed_updater_interval_days" };
  }
  return { ok: true, value: parsed };
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

function toEmbedUpdaterResponse(embedUpdater) {
  const intervalDays = normalizeEmbedUpdaterIntervalDays(
    embedUpdater?.intervalDays,
    DEFAULT_EMBED_UPDATER_INTERVAL_DAYS,
  );
  const lastSummary = embedUpdater?.lastSummary && typeof embedUpdater.lastSummary === "object" ? embedUpdater.lastSummary : {};

  return {
    enabled: embedUpdater?.enabled !== false,
    intervalDays,
    lastCheckedAt: typeof embedUpdater?.lastCheckedAt === "string" ? embedUpdater.lastCheckedAt : "",
    lastRunAt: typeof embedUpdater?.lastRunAt === "string" ? embedUpdater.lastRunAt : "",
    lastSuccessAt: typeof embedUpdater?.lastSuccessAt === "string" ? embedUpdater.lastSuccessAt : "",
    lastError: typeof embedUpdater?.lastError === "string" ? embedUpdater.lastError : "",
    nextRunAt: getEmbedUpdaterNextRunAt({
      enabled: embedUpdater?.enabled !== false,
      intervalDays,
      lastRunAt: typeof embedUpdater?.lastRunAt === "string" ? embedUpdater.lastRunAt : "",
    }),
    lastSummary: {
      status: typeof lastSummary.status === "string" ? lastSummary.status : "idle",
      ggbStatus: typeof lastSummary.ggbStatus === "string" ? lastSummary.ggbStatus : "",
      totalProfiles: Number.isFinite(lastSummary.totalProfiles) ? Math.max(0, Math.trunc(lastSummary.totalProfiles)) : 0,
      syncedProfiles: Number.isFinite(lastSummary.syncedProfiles) ? Math.max(0, Math.trunc(lastSummary.syncedProfiles)) : 0,
      skippedProfiles: Number.isFinite(lastSummary.skippedProfiles) ? Math.max(0, Math.trunc(lastSummary.skippedProfiles)) : 0,
      failedProfiles: Number.isFinite(lastSummary.failedProfiles) ? Math.max(0, Math.trunc(lastSummary.failedProfiles)) : 0,
    },
  };
}

function isRemoteMode(mode) {
  return mode === "webdav";
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
      embedUpdater: toEmbedUpdaterResponse(state.embedUpdater),
      taskQueue: typeof taskQueue?.getStats === "function" ? taskQueue.getStats() : null,
    });
  });

  router.post("/system/embed-updater", authRequired, async (req, res, next) => {
    try {
      const payload = req.body || {};
      const parsedIntervalDays = parseEmbedUpdaterIntervalDays(payload.intervalDays);
      if (!parsedIntervalDays.ok) {
        res.status(400).json({ error: parsedIntervalDays.error });
        return;
      }
      if (payload.enabled !== undefined && typeof payload.enabled !== "boolean") {
        res.status(400).json({ error: "invalid_embed_updater_enabled" });
        return;
      }

      await mutateSystemState({ rootDir }, (state) => {
        const current = state.embedUpdater && typeof state.embedUpdater === "object" ? state.embedUpdater : {};
        state.embedUpdater = {
          ...current,
          enabled: payload.enabled === undefined ? current.enabled !== false : payload.enabled === true,
          intervalDays:
            parsedIntervalDays.value === undefined
              ? normalizeEmbedUpdaterIntervalDays(current.intervalDays, DEFAULT_EMBED_UPDATER_INTERVAL_DAYS)
              : parsedIntervalDays.value,
        };
        return state;
      });

      const nextState = loadSystemState({ rootDir });
      logAdminAudit({
        action: "system.embed_updater.update",
        actor: req.user?.username,
        targetType: "system_embed_updater",
        targetId: "embed_updater",
        outcome: "success",
        details: {
          requestId: req.requestId,
          enabled: nextState.embedUpdater?.enabled !== false,
          intervalDays: nextState.embedUpdater?.intervalDays || DEFAULT_EMBED_UPDATER_INTERVAL_DAYS,
        },
      });

      res.json({
        ok: true,
        embedUpdater: toEmbedUpdaterResponse(nextState.embedUpdater),
      });
    } catch (err) {
      next(err);
    }
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
      await assertPublicHttpUrl(nextWebdav.url);
      const webdav = createWebdavStore(nextWebdav);
      await webdav.listDir("", { depth: 0 });
      res.json({ ok: true });
    } catch (err) {
      if (err.status === 400) {
        res.status(400).json({ error: err.message || "invalid_webdav_url" });
        return;
      }
      res.status(502).json({
        error: "webdav_connect_failed",
      });
    }
  });

  router.post("/system/storage", authRequired, async (req, res, next) => {
    try {
      const payload = req.body || {};
      const rawMode = typeof payload.mode === "string" ? payload.mode : "";
      const hasModeInput = typeof payload.mode === "string" && payload.mode.trim() !== "";
      const requestedMode = normalizeMode(rawMode);
      const sync = payload.sync === true;

      if (hasModeInput && !requestedMode) {
        res.status(400).json({ error: "invalid_storage_mode" });
        return;
      }

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
      logAdminAudit({
        action: "system.storage.update",
        actor: req.user?.username,
        targetType: "system_storage",
        targetId: nextMode,
        outcome: "success",
        details: {
          requestId: req.requestId,
          sync,
          mode: nextMode,
          scanRemote: webdav.scanRemote === true,
        },
      });
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
