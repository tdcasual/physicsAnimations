export type BackNavigationMode = "history-back" | "replace-home";

export function resolveBackNavigationMode(historyState: unknown): BackNavigationMode {
  if (!historyState || typeof historyState !== "object") return "replace-home";
  const back = (historyState as Record<string, unknown>).back;
  return typeof back === "string" && back.trim() ? "history-back" : "replace-home";
}

const BACK_NAVIGATION_FALLBACK_HASH_KEY = "pa_back_navigation_fallback_hash";

function normalizeFallbackHash(raw: string | null | undefined): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  return value.startsWith("#") ? value : `#${value.replace(/^#+/, "")}`;
}

export function writeBackNavigationFallbackHash(hash: string) {
  try {
    const normalizedHash = normalizeFallbackHash(hash);
    if (!normalizedHash) {
      sessionStorage.removeItem(BACK_NAVIGATION_FALLBACK_HASH_KEY);
      return;
    }
    sessionStorage.setItem(BACK_NAVIGATION_FALLBACK_HASH_KEY, normalizedHash);
  } catch {
    // ignore
  }
}

export function readBackNavigationFallbackHash(): string {
  try {
    return normalizeFallbackHash(sessionStorage.getItem(BACK_NAVIGATION_FALLBACK_HASH_KEY));
  } catch {
    return "";
  }
}

export function clearBackNavigationFallbackHash() {
  try {
    sessionStorage.removeItem(BACK_NAVIGATION_FALLBACK_HASH_KEY);
  } catch {
    // ignore
  }
}

export function resolveBackNavigationTarget(input: {
  historyState: unknown;
  fallbackHash?: string;
}): {
  mode: BackNavigationMode;
  path: string;
  hash: string;
} {
  const mode = resolveBackNavigationMode(input.historyState);
  if (mode === "history-back") {
    return {
      mode,
      path: "",
      hash: "",
    };
  }

  return {
    mode,
    path: "/",
    hash: normalizeFallbackHash(input.fallbackHash),
  };
}
