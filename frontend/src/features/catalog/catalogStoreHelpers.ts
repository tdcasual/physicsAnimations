import type { CatalogItem, CatalogViewStateSnapshot } from './types'

const VIEW_STATE_VERSION = 2

export function parseViewState(raw: string | null | undefined): CatalogViewStateSnapshot | null {
  try {
    if (!raw) return null
    const data = JSON.parse(raw) as Record<string, unknown>
    if (data.version !== VIEW_STATE_VERSION) return null
    const groupId = typeof data.groupId === 'string' ? data.groupId : ''
    const categoryId = typeof data.categoryId === 'string' ? data.categoryId : ''
    const query = typeof data.query === 'string' ? data.query : ''
    if (!groupId) return null
    return { groupId, categoryId: categoryId || 'all', query }
  } catch {
    return null
  }
}

export function serializeViewState(snapshot: CatalogViewStateSnapshot): string {
  return JSON.stringify({
    version: VIEW_STATE_VERSION,
    groupId: String(snapshot.groupId || '').trim(),
    categoryId: String(snapshot.categoryId || 'all').trim() || 'all',
    query: String(snapshot.query || ''),
  })
}

export interface ResolvedEntries<T> {
  validEntries: T[]
  resolvedItems: CatalogItem[]
}

export function resolveEntries<T extends { id: string }>(
  entries: T[] | undefined,
  itemById: Map<string, CatalogItem>,
  timestampKey: keyof T
): ResolvedEntries<T> {
  const seen = new Set<string>()
  const sortedEntries = [...(entries || [])].sort(
    (left, right) => Number(right[timestampKey]) - Number(left[timestampKey])
  )
  const validEntries: T[] = []
  const resolvedItems: CatalogItem[] = []

  for (const entry of sortedEntries) {
    const id = String(entry.id || '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const item = itemById.get(id)
    if (!item) continue
    validEntries.push(entry)
    resolvedItems.push(item)
  }
  return { validEntries, resolvedItems }
}

export function pruneEntries<T extends { id: string }>(
  entries: T[],
  validIds: Set<string>,
  writeFn: (entries: T[]) => void
): T[] {
  const valid = entries.filter(entry => validIds.has(entry.id))
  if (valid.length !== entries.length) {
    writeFn(valid)
  }
  return valid
}
