const CATALOG_RETURN_SCROLL_KEY = 'pa_catalog_return_scroll'
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000

export interface CatalogReturnScrollSnapshot {
  catalogFullPath: string
  destinationPath: string
  scrollY: number
  timestamp: number
}

export function parseCatalogReturnScroll(
  raw: string | null | undefined
): CatalogReturnScrollSnapshot | null {
  try {
    if (!raw) return null
    const data = JSON.parse(raw) as Record<string, unknown>
    const catalogFullPath = typeof data.catalogFullPath === 'string' ? data.catalogFullPath : ''
    const destinationPath = typeof data.destinationPath === 'string' ? data.destinationPath : ''
    const scrollY = Number(data.scrollY)
    const timestamp = Number(data.timestamp)
    if (!catalogFullPath || !destinationPath) return null
    if (!Number.isFinite(scrollY) || scrollY < 0) return null
    if (!Number.isFinite(timestamp) || timestamp <= 0) return null
    return {
      catalogFullPath,
      destinationPath,
      scrollY,
      timestamp,
    }
  } catch {
    return null
  }
}

export function serializeCatalogReturnScroll(snapshot: CatalogReturnScrollSnapshot): string {
  return JSON.stringify({
    catalogFullPath: String(snapshot.catalogFullPath || '').trim(),
    destinationPath: String(snapshot.destinationPath || '').trim(),
    scrollY: Math.max(0, Number(snapshot.scrollY) || 0),
    timestamp: Number(snapshot.timestamp) || 0,
  })
}

export function writeCatalogReturnScroll(snapshot: CatalogReturnScrollSnapshot) {
  try {
    sessionStorage.setItem(CATALOG_RETURN_SCROLL_KEY, serializeCatalogReturnScroll(snapshot))
  } catch {
    // ignore
  }
}

export function readCatalogReturnScroll(): CatalogReturnScrollSnapshot | null {
  try {
    return parseCatalogReturnScroll(sessionStorage.getItem(CATALOG_RETURN_SCROLL_KEY))
  } catch {
    return null
  }
}

export function clearCatalogReturnScroll() {
  try {
    sessionStorage.removeItem(CATALOG_RETURN_SCROLL_KEY)
  } catch {
    // ignore
  }
}

export function resolveCatalogReturnScrollRestore(input: {
  currentFullPath: string
  historyState: unknown
  snapshot?: CatalogReturnScrollSnapshot | null
  now?: number
  maxAgeMs?: number
}): CatalogReturnScrollSnapshot | null {
  const snapshot = input.snapshot ?? readCatalogReturnScroll()
  if (!snapshot) return null

  const historyState = input.historyState
  const forward =
    historyState &&
    typeof historyState === 'object' &&
    typeof (historyState as Record<string, unknown>).forward === 'string'
      ? String((historyState as Record<string, unknown>).forward || '').trim()
      : ''

  if (!forward || forward !== snapshot.destinationPath) return null
  if (String(input.currentFullPath || '') !== snapshot.catalogFullPath) return null

  const now = Number(input.now) || Date.now()
  const maxAgeMs = Number(input.maxAgeMs) || DEFAULT_MAX_AGE_MS
  if (now - snapshot.timestamp > maxAgeMs) return null

  return snapshot
}
