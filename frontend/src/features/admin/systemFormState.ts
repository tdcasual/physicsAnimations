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

export interface SystemUpdatePayload {
  mode: string;
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

export function normalizeUiMode(mode: string): string {
  const raw = String(mode || "").trim().toLowerCase();
  if (raw === "webdav") return "hybrid";
  if (raw === "hybrid" || raw === "local") return raw;
  return "local";
}

export function normalizeWebdavBasePath(value: string): string {
  const trimmed = String(value || "").trim();
  return trimmed || "physicsAnimations";
}

export function parseTimeoutMs(timeoutRaw: string): number | undefined {
  const raw = String(timeoutRaw || "").trim();
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function shouldRequireWebdavUrl(mode: string): boolean {
  return mode === "hybrid" || mode === "webdav";
}

export function shouldAutoEnableSyncOnSave(params: { loadedMode: string; nextMode: string }): boolean {
  return params.nextMode === "hybrid" && params.loadedMode !== "hybrid";
}

export function buildSystemUpdatePayload(input: SystemFormInput): SystemUpdatePayload {
  const payload: SystemUpdatePayload = {
    mode: input.mode || "local",
    sync: input.sync === true,
    webdav: {
      url: String(input.url || "").trim(),
      basePath: normalizeWebdavBasePath(input.basePath),
      username: String(input.username || "").trim(),
      scanRemote: input.scanRemote === true,
    },
  };

  const password = String(input.password || "");
  if (password) payload.webdav.password = password;

  const timeoutMs = parseTimeoutMs(input.timeoutRaw);
  if (timeoutMs !== undefined) payload.webdav.timeoutMs = timeoutMs;

  return payload;
}
