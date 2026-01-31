const fs = require("fs");
const path = require("path");

const SYSTEM_STATE_FILE = "system.json";
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

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function normalizeMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  if (mode === "webdav") return "webdav";
  if (mode === "hybrid") return "hybrid";
  if (mode === "local+webdav") return "hybrid";
  if (mode === "mirror") return "hybrid";
  if (mode === "local") return "local";
  return "";
}

function systemStatePath(rootDir) {
  return path.join(rootDir, "content", SYSTEM_STATE_FILE);
}

function buildEnvDefaults() {
  const envMode = normalizeMode(process.env.STORAGE_MODE || "");
  const envWebdavUrl = String(process.env.WEBDAV_URL || "");
  const mode = envMode || (envWebdavUrl ? "hybrid" : "local");
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
        timeoutMs: toInt(process.env.WEBDAV_TIMEOUT_MS || "15000", 15000),
      },
    },
  };
}

function normalizeState(raw, fallback) {
  const base = fallback || buildEnvDefaults();
  if (!raw || typeof raw !== "object") return base;

  const storage = raw.storage && typeof raw.storage === "object" ? raw.storage : {};
  const mode = normalizeMode(storage.mode) || base.storage.mode;
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
        timeoutMs: Number.isFinite(webdav.timeoutMs)
          ? toInt(webdav.timeoutMs, base.storage.webdav.timeoutMs)
          : base.storage.webdav.timeoutMs,
      },
    },
  };
}

function loadSystemState({ rootDir }) {
  const fallback = buildEnvDefaults();
  const filePath = systemStatePath(rootDir);
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeState(parsed, fallback);
  } catch {
    return fallback;
  }
}

function saveSystemState({ rootDir, state }) {
  const filePath = systemStatePath(rootDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const payload = normalizeState(state, buildEnvDefaults());
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
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
  loadSystemState,
  saveSystemState,
  mutateSystemState,
  normalizeMode,
  noSave,
};
