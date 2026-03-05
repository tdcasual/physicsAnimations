const SYNC_OPTION_NUMERIC_RANGES = {
  maxFiles: { min: 1, max: 2000 },
  maxTotalBytes: { min: 16 * 1024, max: 512 * 1024 * 1024 },
  maxFileBytes: { min: 1024, max: 128 * 1024 * 1024 },
  timeoutMs: { min: 10, max: 120000 },
  concurrency: { min: 1, max: 16 },
  keepReleases: { min: 1, max: 20 },
  retryMaxAttempts: { min: 1, max: 8 },
  retryBaseDelayMs: { min: 1, max: 10000 },
};

function normalizeBoolean(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value || "").trim().toLowerCase();
  if (!text) return fallback;
  if (text === "1" || text === "true" || text === "yes" || text === "on") return true;
  if (text === "0" || text === "false" || text === "no" || text === "off") return false;
  return fallback;
}

function toIntInRange(value, { min, max }, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  if (!Number.isFinite(normalized)) return fallback;
  if (normalized < min || normalized > max) return fallback;
  return normalized;
}

function normalizeSyncOptions(value, fallback = {}) {
  if (value === undefined || value === null || value === "") return { ...fallback };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...fallback };

  const out = { ...fallback };
  for (const [key, range] of Object.entries(SYNC_OPTION_NUMERIC_RANGES)) {
    if (value[key] === undefined) continue;
    out[key] = toIntInRange(value[key], range, fallback[key]);
  }
  if (value.strictSelfCheck !== undefined) {
    out.strictSelfCheck = normalizeBoolean(value.strictSelfCheck, fallback.strictSelfCheck !== false);
  }
  return out;
}

module.exports = {
  SYNC_OPTION_NUMERIC_RANGES,
  normalizeSyncOptions,
};
