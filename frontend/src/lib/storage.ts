const STORAGE_VERSION_KEY = "pa_storage_schema_version";
const CURRENT_SCHEMA_VERSION = 1;

function ensureSchemaVersion(): void {
  const stored = Number(localStorage.getItem(STORAGE_VERSION_KEY) || "0");
  if (stored < CURRENT_SCHEMA_VERSION) {
    // Future migrations can be added here.
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
  }
}

ensureSchemaVersion();

export function getStorageItem(key: string): string | null {
  return localStorage.getItem(key);
}

export function setStorageItem(key: string, value: string): void {
  localStorage.setItem(key, value);
}

export function removeStorageItem(key: string): void {
  localStorage.removeItem(key);
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
