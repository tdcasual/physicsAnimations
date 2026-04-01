export interface SystemFormInput {
  mode: string;
  url: string;
  basePath: string;
  username: string;
  password: string;
  timeoutRaw: string;
  scanRemote: boolean;
  sync: boolean;
}

export type StorageMode = "local" | "webdav";

export interface SystemUpdatePayload {
  mode: StorageMode;
  sync: boolean;
  webdav: {
    url: string;
    basePath: string;
    username: string;
    scanRemote: boolean;
    password?: string;
    timeoutMs?: number;
  };
}

export function normalizeUiMode(mode: string): StorageMode | "" {
  const raw = String(mode || "").trim().toLowerCase();
  if (raw === "webdav" || raw === "local") return raw;
  return "";
}

function requireUiMode(mode: string): StorageMode {
  const normalized = normalizeUiMode(mode);
  if (!normalized) {
    throw new Error("invalid_storage_mode");
  }
  return normalized;
}

export function normalizeWebdavBasePath(value: string): string {
  const trimmed = String(value || "").trim();
  return trimmed || "physicsAnimations";
}

export function parseTimeoutMs(timeoutRaw: string): number | undefined {
  const raw = String(timeoutRaw || "").trim();
  if (!raw) return undefined;
  if (!/^\d+$/.test(raw)) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function shouldRequireWebdavUrl(mode: string): boolean {
  return normalizeUiMode(mode) === "webdav";
}

export function isRemoteMode(mode: string): boolean {
  const normalized = normalizeUiMode(mode);
  return normalized === "webdav";
}

export function canRunManualSync(params: { mode: string; url: string }): boolean {
  if (!isRemoteMode(params.mode)) return false;
  return Boolean(String(params.url || "").trim());
}

export function buildSystemUpdatePayload(input: SystemFormInput): SystemUpdatePayload {
  const mode = requireUiMode(input.mode);
  const payload: SystemUpdatePayload = {
    mode,
    sync: input.sync === true,
    webdav: {
      url: String(input.url || "").trim(),
      basePath: normalizeWebdavBasePath(input.basePath),
      username: String(input.username || "").trim(),
      scanRemote: input.scanRemote === true,
    },
  };

  const password = String(input.password || "");
  if (password.trim()) payload.webdav.password = password;

  const timeoutMs = parseTimeoutMs(input.timeoutRaw);
  if (timeoutMs !== undefined) payload.webdav.timeoutMs = timeoutMs;

  return payload;
}
