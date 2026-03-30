export interface SystemStorage {
  mode: string
  effectiveMode: string
  readOnly: boolean
  localPath: string
  lastSyncedAt: string
  webdav: {
    url: string
    basePath: string
    username: string
    timeoutMs: number
    hasPassword: boolean
    scanRemote: boolean
  }
}

export interface SystemEmbedUpdaterSummary {
  status: string
  ggbStatus: string
  totalProfiles: number
  syncedProfiles: number
  skippedProfiles: number
  failedProfiles: number
}

export interface SystemEmbedUpdater {
  enabled: boolean
  intervalDays: number
  lastCheckedAt: string
  lastRunAt: string
  lastSuccessAt: string
  lastError: string
  nextRunAt: string
  lastSummary: SystemEmbedUpdaterSummary
}

export type WizardStep = 1 | 2 | 3 | 4
