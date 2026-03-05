const { normalizeUrlLike, isHttpUrl, normalizeLocalMirrorRelativePath } = require("../normalizers");

const RELEASE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/i;
const SYNC_CODE_PATTERN = /^[a-z0-9_]{2,80}$/i;
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function parseEnvInt(name, fallback, { min, max }) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw)) return fallback;
  const value = Math.trunc(raw);
  if (!Number.isFinite(value)) return fallback;
  if (value < min || value > max) return fallback;
  return value;
}

function parseEnvBool(name, fallback) {
  const value = String(process.env[name] || "").trim().toLowerCase();
  if (!value) return fallback;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
}

const DEFAULT_SYNC_OPTIONS = Object.freeze({
  maxFiles: parseEnvInt("LIBRARY_EMBED_SYNC_MAX_FILES", 120, { min: 1, max: 2000 }),
  maxTotalBytes: parseEnvInt("LIBRARY_EMBED_SYNC_MAX_TOTAL_BYTES", 25 * 1024 * 1024, {
    min: 16 * 1024,
    max: 512 * 1024 * 1024,
  }),
  maxFileBytes: parseEnvInt("LIBRARY_EMBED_SYNC_MAX_FILE_BYTES", 8 * 1024 * 1024, {
    min: 1024,
    max: 128 * 1024 * 1024,
  }),
  timeoutMs: parseEnvInt("LIBRARY_EMBED_SYNC_TIMEOUT_MS", 12000, { min: 10, max: 120000 }),
  concurrency: parseEnvInt("LIBRARY_EMBED_SYNC_CONCURRENCY", 4, { min: 1, max: 16 }),
  keepReleases: parseEnvInt("LIBRARY_EMBED_SYNC_KEEP_RELEASES", 3, { min: 1, max: 20 }),
  retryMaxAttempts: parseEnvInt("LIBRARY_EMBED_SYNC_RETRY_MAX_ATTEMPTS", 3, { min: 1, max: 8 }),
  retryBaseDelayMs: parseEnvInt("LIBRARY_EMBED_SYNC_RETRY_BASE_DELAY_MS", 80, { min: 1, max: 10000 }),
  strictSelfCheck: parseEnvBool("LIBRARY_EMBED_SYNC_STRICT_SELF_CHECK", true),
});

function normalizeSyncCode(value, fallback = "sync_failed") {
  const code = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!code) return fallback;
  return SYNC_CODE_PATTERN.test(code) ? code : fallback;
}

function createReleaseId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `r${ts}${rand}`;
}

function extractReleaseIdFromPublicPath(value) {
  const text = String(value || "");
  const match = text.match(/\/embed-profiles\/[^/]+\/releases\/([^/]+)\//);
  if (!match) return "";
  const releaseId = String(match[1] || "").trim();
  if (!RELEASE_ID_PATTERN.test(releaseId)) return "";
  return releaseId;
}

function sanitizeReleaseHistory(value) {
  const source = Array.isArray(value) ? value : [];
  const out = [];
  for (const item of source) {
    const releaseId = String(item || "").trim();
    if (!RELEASE_ID_PATTERN.test(releaseId)) continue;
    if (!out.includes(releaseId)) out.push(releaseId);
  }
  return out;
}

function sanitizeSyncCache(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [rawUrl, rawEntry] of Object.entries(value)) {
    const absoluteUrl = normalizeUrlLike(rawUrl);
    if (!isHttpUrl(absoluteUrl)) continue;
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) continue;
    const relativePath = normalizeLocalMirrorRelativePath(rawEntry.relativePath);
    if (!relativePath) continue;
    out[absoluteUrl] = {
      etag: String(rawEntry.etag || "").trim(),
      lastModified: String(rawEntry.lastModified || "").trim(),
      contentType: String(rawEntry.contentType || "").trim(),
      relativePath,
    };
  }
  return out;
}

function createSyncError({
  code,
  detail = "",
  retryable = false,
  status = 0,
  url = "",
  source = "",
  syncReport = null,
} = {}) {
  const syncCode = normalizeSyncCode(code, "sync_failed");
  const error = new Error(syncCode);
  error.syncCode = syncCode;
  error.syncDetail = String(detail || "");
  error.retryable = retryable === true;
  error.status = Number(status || 0);
  error.url = String(url || "");
  error.source = String(source || "");
  if (syncReport && typeof syncReport === "object") {
    error.syncReport = syncReport;
  }
  return error;
}

function waitWithSignal(ms, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }, Math.max(0, Number(ms || 0)));
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const reason = signal?.reason;
      if (reason && typeof reason === "object") {
        reject(reason);
        return;
      }
      reject(createSyncError({ code: "sync_cancelled", detail: "aborted_during_wait" }));
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

function mergeAbortSignals(signals) {
  const active = (signals || []).filter(Boolean);
  if (active.length === 0) return null;
  if (active.length === 1) return active[0];
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
    return AbortSignal.any(active);
  }
  const controller = new AbortController();
  const onAbort = (event) => {
    const reason = event?.target?.reason || createSyncError({ code: "sync_cancelled", detail: "merged_signal_abort" });
    if (!controller.signal.aborted) controller.abort(reason);
  };
  for (const signal of active) {
    if (signal.aborted) {
      controller.abort(signal.reason || createSyncError({ code: "sync_cancelled", detail: "merged_signal_aborted" }));
      return controller.signal;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

module.exports = {
  RELEASE_ID_PATTERN,
  RETRYABLE_HTTP_STATUSES,
  DEFAULT_SYNC_OPTIONS,
  normalizeSyncCode,
  createReleaseId,
  extractReleaseIdFromPublicPath,
  sanitizeReleaseHistory,
  sanitizeSyncCache,
  createSyncError,
  waitWithSignal,
  mergeAbortSignals,
};
