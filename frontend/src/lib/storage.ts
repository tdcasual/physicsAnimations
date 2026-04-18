const STORAGE_VERSION_KEY = "pa_storage_schema_version";
const CURRENT_SCHEMA_VERSION = 1;

/** 清理优先级：低优先级数据优先删除 */
const CLEANUP_CANDIDATES = ["pa_recent_activity", "pa_favorites", "pa_catalog_view_state", "pa_catalog_search"];

class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: "QUOTA_EXCEEDED" | "PRIVATE_MODE" | "UNKNOWN"
  ) {
    super(message);
  }
}

function detectError(e: unknown): StorageError {
  if (e instanceof Error) {
    if (e.name === "QuotaExceededError" || e.message?.toLowerCase().includes("quota")) {
      return new StorageError("存储空间已满", "QUOTA_EXCEEDED");
    }
    if (e.name === "SecurityError" || e.message?.toLowerCase().includes("private")) {
      return new StorageError("隐私模式限制", "PRIVATE_MODE");
    }
  }
  return new StorageError("存储操作失败", "UNKNOWN");
}

function cleanupOldData(): boolean {
  for (const key of CLEANUP_CANDIDATES) {
    try {
      localStorage.removeItem(key);
      // 只要能执行 removeItem 就说明没有抛异常，认为成功
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

function ensureSchemaVersion(): void {
  const stored = Number(localStorage.getItem(STORAGE_VERSION_KEY) || "0");
  if (stored < CURRENT_SCHEMA_VERSION) {
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
  }
}
ensureSchemaVersion();

export function getStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    const err = detectError(e);
    if (err.code === "QUOTA_EXCEEDED" && cleanupOldData()) {
      // 清理后重试一次
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        /* fallthrough */
      }
    }
    console.warn(`[Storage] 写入失败 (${err.code}):`, key);
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function getStorageObject<T>(key: string): T | null {
  const raw = getStorageItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStorageObject<T>(key: string, value: T): void {
  setStorageItem(key, JSON.stringify(value));
}
