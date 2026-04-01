const RECENT_ACTIVITY_KEY = "pa_recent_activity_v1";
const DEFAULT_RECENT_LIMIT = 12;

export interface RecentActivityEntry {
  id: string;
  lastViewedAt: number;
}

function normalizeRecentActivityEntry(value: unknown): RecentActivityEntry | null {
  if (!value || typeof value !== "object") return null;
  const id = typeof (value as Record<string, unknown>).id === "string" ? String((value as Record<string, unknown>).id || "").trim() : "";
  const lastViewedAt = Number((value as Record<string, unknown>).lastViewedAt);
  if (!id || !Number.isFinite(lastViewedAt) || lastViewedAt <= 0) return null;

  return {
    id,
    lastViewedAt,
  };
}

export function parseRecentActivity(raw: string | null | undefined): RecentActivityEntry[] {
  try {
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecentActivityEntry).filter((entry): entry is RecentActivityEntry => Boolean(entry));
  } catch {
    return [];
  }
}

export function serializeRecentActivity(entries: RecentActivityEntry[]): string {
  return JSON.stringify(
    (entries || []).map((entry) => ({
      id: String(entry.id || "").trim(),
      lastViewedAt: Number(entry.lastViewedAt) || 0,
    })),
  );
}

export function readRecentActivity(): RecentActivityEntry[] {
  try {
    return parseRecentActivity(localStorage.getItem(RECENT_ACTIVITY_KEY));
  } catch {
    return [];
  }
}

export function writeRecentActivity(entries: RecentActivityEntry[]) {
  try {
    localStorage.setItem(RECENT_ACTIVITY_KEY, serializeRecentActivity(entries));
  } catch {
    // ignore
  }
}

export function recordRecentActivity(id: string, options: { now?: number; limit?: number } = {}): RecentActivityEntry[] {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) return readRecentActivity();

  const now = Number(options.now) || Date.now();
  const limit = Math.max(1, Number(options.limit) || DEFAULT_RECENT_LIMIT);
  const next = [
    { id: normalizedId, lastViewedAt: now },
    ...readRecentActivity().filter((entry) => entry.id !== normalizedId),
  ].slice(0, limit);

  writeRecentActivity(next);
  return next;
}
