export function getCatalogHashFallbackSelector(hash: string): string {
  const value = String(hash || '').trim()
  if (value === '#catalog-library' || value === '#catalog-current') {
    return '#catalog-all'
  }
  return ''
}
