export type LibraryCoverType = 'blank' | 'image'
export type LibraryOpenMode = 'embed' | 'download'
export type LibraryAssetStatus = 'ready' | 'failed'

export interface LibraryEmbedSyncOptions {
  maxFiles?: number
  maxTotalBytes?: number
  maxFileBytes?: number
  timeoutMs?: number
  concurrency?: number
  keepReleases?: number
  retryMaxAttempts?: number
  retryBaseDelayMs?: number
  strictSelfCheck?: boolean
}

export interface LibraryEmbedSyncReport {
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  totalUrls?: number
  fetchedCount?: number
  reusedCount?: number
  failedCount?: number
  totalBytes?: number
  maxObservedConcurrency?: number
  unresolvedCount?: number
  limits?: Record<string, unknown>
}

export interface LibraryEmbedSyncCacheEntry {
  etag?: string
  lastModified?: string
  contentType?: string
  relativePath?: string
}

export interface LibraryFolder {
  id: string
  name: string
  categoryId: string
  coverType: LibraryCoverType
  coverPath: string
  parentId?: string | null
  order?: number
  assetCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface LibraryAsset {
  id: string
  folderId: string
  adapterKey: string
  displayName: string
  fileName: string
  filePath: string
  fileSize: number
  openMode: LibraryOpenMode
  generatedEntryPath: string
  embedProfileId: string
  embedOptions: Record<string, unknown>
  status: LibraryAssetStatus
  deleted: boolean
  deletedAt: string
  createdAt?: string
  updatedAt?: string
}

export interface LibraryEmbedProfile {
  id: string
  name: string
  scriptUrl: string
  fallbackScriptUrl: string
  viewerPath: string
  remoteScriptUrl: string
  remoteViewerPath: string
  syncStatus: string
  syncMessage: string
  lastSyncAt: string
  constructorName: string
  assetUrlOptionKey: string
  matchExtensions: string[]
  defaultOptions: Record<string, unknown>
  syncOptions: LibraryEmbedSyncOptions
  syncLastReport: LibraryEmbedSyncReport
  syncCache: Record<string, LibraryEmbedSyncCacheEntry>
  activeReleaseId: string
  releaseHistory: string[]
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

export interface LibraryCatalogResponse {
  folders: LibraryFolder[]
}

export interface LibraryFolderAssetsResponse {
  assets: LibraryAsset[]
}
