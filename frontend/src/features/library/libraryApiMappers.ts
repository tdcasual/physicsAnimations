import type { LibraryAsset, LibraryEmbedProfile, LibraryFolder } from './types'

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toOptionalId(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? text : null
}

function toOpenMode(value: unknown): 'embed' | 'download' {
  const mode = String(value ?? '')
    .trim()
    .toLowerCase()
  if (mode === 'embed' || mode === 'download') return mode
  throw new Error('invalid_open_mode')
}

function toObjectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function toOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  return undefined
}

function toSyncOptions(value: unknown): LibraryEmbedProfile['syncOptions'] {
  const source = toObjectRecord(value)
  const out: LibraryEmbedProfile['syncOptions'] = {}
  const maxFiles = toOptionalNumber(source.maxFiles)
  const maxTotalBytes = toOptionalNumber(source.maxTotalBytes)
  const maxFileBytes = toOptionalNumber(source.maxFileBytes)
  const timeoutMs = toOptionalNumber(source.timeoutMs)
  const concurrency = toOptionalNumber(source.concurrency)
  const keepReleases = toOptionalNumber(source.keepReleases)
  const retryMaxAttempts = toOptionalNumber(source.retryMaxAttempts)
  const retryBaseDelayMs = toOptionalNumber(source.retryBaseDelayMs)
  const strictSelfCheck = toOptionalBoolean(source.strictSelfCheck)
  if (maxFiles !== undefined) out.maxFiles = maxFiles
  if (maxTotalBytes !== undefined) out.maxTotalBytes = maxTotalBytes
  if (maxFileBytes !== undefined) out.maxFileBytes = maxFileBytes
  if (timeoutMs !== undefined) out.timeoutMs = timeoutMs
  if (concurrency !== undefined) out.concurrency = concurrency
  if (keepReleases !== undefined) out.keepReleases = keepReleases
  if (retryMaxAttempts !== undefined) out.retryMaxAttempts = retryMaxAttempts
  if (retryBaseDelayMs !== undefined) out.retryBaseDelayMs = retryBaseDelayMs
  if (strictSelfCheck !== undefined) out.strictSelfCheck = strictSelfCheck
  return out
}

function toSyncReport(value: unknown): LibraryEmbedProfile['syncLastReport'] {
  return toObjectRecord(value) as LibraryEmbedProfile['syncLastReport']
}

function toSyncCache(value: unknown): LibraryEmbedProfile['syncCache'] {
  const source = toObjectRecord(value)
  const out: LibraryEmbedProfile['syncCache'] = {}
  for (const [rawUrl, rawEntry] of Object.entries(source)) {
    const url = String(rawUrl || '').trim()
    if (!url) continue
    const entry = toObjectRecord(rawEntry)
    out[url] = {
      etag: String(entry.etag || ''),
      lastModified: String(entry.lastModified || ''),
      contentType: String(entry.contentType || ''),
      relativePath: String(entry.relativePath || ''),
    }
  }
  return out
}

export function toFolder(value: any): LibraryFolder {
  return {
    id: String(value?.id || ''),
    name: String(value?.name || ''),
    categoryId: String(value?.categoryId || 'other'),
    coverType: value?.coverType === 'image' ? 'image' : 'blank',
    coverPath: String(value?.coverPath || ''),
    parentId: toOptionalId(value?.parentId),
    order: toFiniteNumber(value?.order, 0),
    assetCount: toFiniteNumber(value?.assetCount, 0),
    createdAt: String(value?.createdAt || ''),
    updatedAt: String(value?.updatedAt || ''),
  }
}

export function toAsset(value: any): LibraryAsset {
  const deleted = value?.deleted === true
  return {
    id: String(value?.id || ''),
    folderId: String(value?.folderId || ''),
    adapterKey: String(value?.adapterKey || ''),
    displayName: String(value?.displayName || ''),
    fileName: String(value?.fileName || ''),
    filePath: String(value?.filePath || ''),
    fileSize: toFiniteNumber(value?.fileSize, 0),
    openMode: toOpenMode(value?.openMode),
    generatedEntryPath: String(value?.generatedEntryPath || ''),
    embedProfileId: String(value?.embedProfileId || ''),
    embedOptions: toObjectRecord(value?.embedOptions),
    status: value?.status === 'failed' ? 'failed' : 'ready',
    deleted,
    deletedAt: deleted ? String(value?.deletedAt || '') : '',
    createdAt: String(value?.createdAt || ''),
    updatedAt: String(value?.updatedAt || ''),
  }
}

export function toEmbedProfile(value: any): LibraryEmbedProfile {
  return {
    id: String(value?.id || ''),
    name: String(value?.name || ''),
    scriptUrl: String(value?.scriptUrl || ''),
    fallbackScriptUrl: String(value?.fallbackScriptUrl || ''),
    viewerPath: String(value?.viewerPath || ''),
    remoteScriptUrl: String(value?.remoteScriptUrl || value?.scriptUrl || ''),
    remoteViewerPath: String(value?.remoteViewerPath || value?.viewerPath || ''),
    syncStatus: String(value?.syncStatus || 'pending'),
    syncMessage: String(value?.syncMessage || ''),
    lastSyncAt: String(value?.lastSyncAt || ''),
    constructorName: String(value?.constructorName || 'ElectricFieldApp'),
    assetUrlOptionKey: String(value?.assetUrlOptionKey || 'sceneUrl'),
    matchExtensions: Array.isArray(value?.matchExtensions)
      ? value.matchExtensions.map((item: unknown) => String(item || '').trim()).filter(Boolean)
      : [],
    defaultOptions: toObjectRecord(value?.defaultOptions),
    syncOptions: toSyncOptions(value?.syncOptions),
    syncLastReport: toSyncReport(value?.syncLastReport),
    syncCache: toSyncCache(value?.syncCache),
    activeReleaseId: String(value?.activeReleaseId || ''),
    releaseHistory: Array.isArray(value?.releaseHistory)
      ? value.releaseHistory.map((item: unknown) => String(item || '').trim()).filter(Boolean)
      : [],
    enabled: value?.enabled !== false,
    createdAt: String(value?.createdAt || ''),
    updatedAt: String(value?.updatedAt || ''),
  }
}
