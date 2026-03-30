const FAVORITE_DEMOS_KEY = 'pa_favorite_demos_v1'
const DEFAULT_FAVORITE_LIMIT = 24

export interface FavoriteDemoEntry {
  id: string
  favoritedAt: number
}

function normalizeFavoriteDemoEntry(value: unknown): FavoriteDemoEntry | null {
  if (!value || typeof value !== 'object') return null
  const id =
    typeof (value as Record<string, unknown>).id === 'string'
      ? String((value as Record<string, unknown>).id || '').trim()
      : ''
  const favoritedAt = Number((value as Record<string, unknown>).favoritedAt)
  if (!id || !Number.isFinite(favoritedAt) || favoritedAt <= 0) return null

  return {
    id,
    favoritedAt,
  }
}

export function parseFavoriteDemos(raw: string | null | undefined): FavoriteDemoEntry[] {
  try {
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeFavoriteDemoEntry)
      .filter((entry): entry is FavoriteDemoEntry => Boolean(entry))
  } catch {
    return []
  }
}

export function serializeFavoriteDemos(entries: FavoriteDemoEntry[]): string {
  return JSON.stringify(
    (entries || []).map(entry => ({
      id: String(entry.id || '').trim(),
      favoritedAt: Number(entry.favoritedAt) || 0,
    }))
  )
}

export function readFavoriteDemos(): FavoriteDemoEntry[] {
  try {
    return parseFavoriteDemos(localStorage.getItem(FAVORITE_DEMOS_KEY))
  } catch {
    return []
  }
}

export function writeFavoriteDemos(entries: FavoriteDemoEntry[]) {
  try {
    localStorage.setItem(FAVORITE_DEMOS_KEY, serializeFavoriteDemos(entries))
  } catch {
    // ignore
  }
}

export function isFavoriteDemo(id: string): boolean {
  const normalizedId = String(id || '').trim()
  if (!normalizedId) return false
  return readFavoriteDemos().some(entry => entry.id === normalizedId)
}

export function toggleFavoriteDemo(
  id: string,
  options: { now?: number; limit?: number } = {}
): { entries: FavoriteDemoEntry[]; isFavorite: boolean } {
  const normalizedId = String(id || '').trim()
  if (!normalizedId) {
    return {
      entries: readFavoriteDemos(),
      isFavorite: false,
    }
  }

  const entries = readFavoriteDemos()
  const existing = entries.some(entry => entry.id === normalizedId)

  if (existing) {
    const next = entries.filter(entry => entry.id !== normalizedId)
    writeFavoriteDemos(next)
    return {
      entries: next,
      isFavorite: false,
    }
  }

  const now = Number(options.now) || Date.now()
  const limit = Math.max(1, Number(options.limit) || DEFAULT_FAVORITE_LIMIT)
  const next = [
    { id: normalizedId, favoritedAt: now },
    ...entries.filter(entry => entry.id !== normalizedId),
  ].slice(0, limit)

  writeFavoriteDemos(next)
  return {
    entries: next,
    isFavorite: true,
  }
}
