const fs = require("fs");
const path = require("path");

const { createError } = require("./errors");
const { toInt } = require("./shared/normalizers");

const SYSTEM_STATE_FILE = "system.json";
const DEFAULT_EMBED_UPDATER_INTERVAL_DAYS = 20;
const MIN_EMBED_UPDATER_INTERVAL_DAYS = 1;
const MAX_EMBED_UPDATER_INTERVAL_DAYS = 365;
const stateLocks = new Map();
const NO_SAVE = Symbol("system_state_no_save");

function noSave(value) {
  return { [NO_SAVE]: true, value };
}

function withStateLock(key, fn) {
  const previous = stateLocks.get(key) || Promise.resolve();
  let release = () => {};
  const current = new Promise((resolve) => {
    release = resolve;
  });
  stateLocks.set(key, current);

  return previous
    .then(fn)
    .finally(() => {
      release();
      if (stateLocks.get(key) === current) stateLocks.delete(key);
    });
}

function normalizeTimeoutMs(value, fallback = 15000) {
  let parsed = fallback;
  if (typeof value === "number") {
    parsed = Number.isFinite(value) ? Math.trunc(value) : fallback;
  } else if (typeof value === "string") {
    const raw = value.trim();
    if (/^\d+$/.test(raw)) {
      parsed = Number.parseInt(raw, 10);
    }
  } else {
    parsed = toInt(value, fallback);
  }
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1000, parsed);
}

function normalizeMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  if (mode === "webdav") return "webdav";
  if (mode === "local") return "local";
  return "";
}

function normalizeIsoString(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}

function normalizeEmbedUpdaterIntervalDays(value, fallback = DEFAULT_EMBED_UPDATER_INTERVAL_DAYS) {
  let parsed = fallback;
  if (typeof value === "number") {
    parsed = Number.isFinite(value) ? Math.trunc(value) : fallback;
  } else if (typeof value === "string") {
    const raw = value.trim();
    if (/^\d+$/.test(raw)) parsed = Number.parseInt(raw, 10);
  } else {
    parsed = toInt(value, fallback);
  }
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_EMBED_UPDATER_INTERVAL_DAYS, Math.max(MIN_EMBED_UPDATER_INTERVAL_DAYS, parsed));
}

function createDefaultEmbedUpdaterState() {
  return {
    enabled: true,
    intervalDays: DEFAULT_EMBED_UPDATER_INTERVAL_DAYS,
    lastCheckedAt: "",
    lastRunAt: "",
    lastSuccessAt: "",
    lastError: "",
    lastSummary: {
      status: "idle",
      ggbStatus: "",
      totalProfiles: 0,
      syncedProfiles: 0,
      skippedProfiles: 0,
      failedProfiles: 0,
    },
  };
}

function normalizeEmbedUpdater(raw, fallback) {
  const base = fallback && typeof fallback === "object" ? fallback : createDefaultEmbedUpdaterState();
  const source = raw && typeof raw === "object" ? raw : {};
  const summary = source.lastSummary && typeof source.lastSummary === "object" ? source.lastSummary : {};

  return {
    enabled: typeof source.enabled === "boolean" ? source.enabled : base.enabled,
    intervalDays: normalizeEmbedUpdaterIntervalDays(source.intervalDays, base.intervalDays),
    lastCheckedAt: normalizeIsoString(source.lastCheckedAt, base.lastCheckedAt),
    lastRunAt: normalizeIsoString(source.lastRunAt, base.lastRunAt),
    lastSuccessAt: normalizeIsoString(source.lastSuccessAt, base.lastSuccessAt),
    lastError: normalizeIsoString(source.lastError, base.lastError),
    lastSummary: {
      status: normalizeIsoString(summary.status, base.lastSummary.status || "idle"),
      ggbStatus: normalizeIsoString(summary.ggbStatus, base.lastSummary.ggbStatus || ""),
      totalProfiles: Math.max(0, toInt(summary.totalProfiles, base.lastSummary.totalProfiles || 0)),
      syncedProfiles: Math.max(0, toInt(summary.syncedProfiles, base.lastSummary.syncedProfiles || 0)),
      skippedProfiles: Math.max(0, toInt(summary.skippedProfiles, base.lastSummary.skippedProfiles || 0)),
      failedProfiles: Math.max(0, toInt(summary.failedProfiles, base.lastSummary.failedProfiles || 0)),
    },
  };
}

function getEmbedUpdaterNextRunAt(embedUpdater) {
  if (!embedUpdater || embedUpdater.enabled !== true) return "";
  const lastSuccessAt = normalizeIsoString(embedUpdater.lastSuccessAt, "");
  const lastError = normalizeIsoString(embedUpdater.lastError, "");
  const lastRunAt = normalizeIsoString(embedUpdater.lastRunAt, "");
  const anchor = lastSuccessAt || (lastError ? "" : lastRunAt);
  if (!anchor) return "";
  const intervalDays = normalizeEmbedUpdaterIntervalDays(embedUpdater.intervalDays, DEFAULT_EMBED_UPDATER_INTERVAL_DAYS);
  const startedAt = new Date(anchor);
  if (Number.isNaN(startedAt.getTime())) return "";
  return new Date(startedAt.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
}

function systemStatePath(rootDir) {
  return path.join(rootDir, "content", SYSTEM_STATE_FILE);
}

function buildEnvDefaults() {
  const rawEnvMode = String(process.env.STORAGE_MODE || "");
  const envMode = normalizeMode(rawEnvMode);
  if (rawEnvMode.trim() && !envMode) {
    throw createError("invalid_storage_mode", 400, {
      source: "env",
      value: rawEnvMode,
    });
  }
  const envWebdavUrl = String(process.env.WEBDAV_URL || "");
  const mode = envMode || "local";
  return {
    version: 1,
    storage: {
      mode,
      lastSyncedAt: "",
      webdav: {
        url: envWebdavUrl,
        basePath: String(process.env.WEBDAV_BASE_PATH || "physicsAnimations"),
        username: String(process.env.WEBDAV_USERNAME || ""),
        password: String(process.env.WEBDAV_PASSWORD || ""),
        timeoutMs: normalizeTimeoutMs(process.env.WEBDAV_TIMEOUT_MS || "15000", 15000),
        scanRemote: false,
      },
    },
    embedUpdater: createDefaultEmbedUpdaterState(),
  };
}

function normalizeState(raw, fallback) {
  const base = fallback || buildEnvDefaults();
  if (!raw || typeof raw !== "object") return base;

  const storage = raw.storage && typeof raw.storage === "object" ? raw.storage : {};
  const rawStorageMode = typeof storage.mode === "string" ? storage.mode : "";
  const storageModeInput = rawStorageMode.trim() !== "";
  const normalizedStorageMode = normalizeMode(rawStorageMode);
  if (storageModeInput && !normalizedStorageMode) {
    throw createError("invalid_storage_mode", 400, {
      source: "system_state",
      value: rawStorageMode,
    });
  }
  const mode = normalizedStorageMode || base.storage.mode;
  const webdav = storage.webdav && typeof storage.webdav === "object" ? storage.webdav : {};

  return {
    version: 1,
    storage: {
      mode,
      lastSyncedAt: typeof storage.lastSyncedAt === "string" ? storage.lastSyncedAt : base.storage.lastSyncedAt,
      webdav: {
        url: typeof webdav.url === "string" ? webdav.url : base.storage.webdav.url,
        basePath: typeof webdav.basePath === "string" ? webdav.basePath : base.storage.webdav.basePath,
        username: typeof webdav.username === "string" ? webdav.username : base.storage.webdav.username,
        password: typeof webdav.password === "string" ? webdav.password : base.storage.webdav.password,
        timeoutMs: normalizeTimeoutMs(webdav.timeoutMs, base.storage.webdav.timeoutMs),
        scanRemote: typeof webdav.scanRemote === "boolean" ? webdav.scanRemote : base.storage.webdav.scanRemote,
      },
    },
    embedUpdater: normalizeEmbedUpdater(raw.embedUpdater, base.embedUpdater),
  };
}

function loadSystemState({ rootDir }) {
  const fallback = buildEnvDefaults();
  const filePath = systemStatePath(rootDir);
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeState(parsed, fallback);
  } catch (err) {
    if (err?.message === "invalid_storage_mode") throw err;
    return fallback;
  }
}

function saveSystemState({ rootDir, state }) {
  const filePath = systemStatePath(rootDir);
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const payload = normalizeState(state, buildEnvDefaults());
    fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } catch (err) {
    const code = err?.code;
    if (code === "EACCES" || code === "EPERM" || code === "EROFS") {
      throw createError("storage_readonly", 503, {
        reason: "system_state_not_writable",
        filePath,
        hint: "In serverless environments, persist config via environment variables instead of the web UI.",
      });
    }
    throw err;
  }
}

async function mutateSystemState({ rootDir }, mutator) {
  return withStateLock(SYSTEM_STATE_FILE, async () => {
    const current = loadSystemState({ rootDir });
    const result = await mutator(current);
    if (result && result[NO_SAVE]) return result.value;
    saveSystemState({ rootDir, state: current });
    return result;
  });
}

module.exports = {
  DEFAULT_EMBED_UPDATER_INTERVAL_DAYS,
  MAX_EMBED_UPDATER_INTERVAL_DAYS,
  MIN_EMBED_UPDATER_INTERVAL_DAYS,
  createDefaultEmbedUpdaterState,
  getEmbedUpdaterNextRunAt,
  loadSystemState,
  normalizeEmbedUpdater,
  normalizeEmbedUpdaterIntervalDays,
  saveSystemState,
  mutateSystemState,
  normalizeMode,
  noSave,
};
