import type { Ref } from "vue";

import { normalizeUiMode } from "../systemFormState";

import type { SystemEmbedUpdater, SystemStorage, WizardStep } from "./systemWizardTypes";

type SystemWizardBindingsParams = {
  storage: Ref<SystemStorage | null>;
  embedUpdater: Ref<SystemEmbedUpdater | null>;
  wizardStep: Ref<WizardStep>;
  mode: Ref<string>;
  url: Ref<string>;
  basePath: Ref<string>;
  username: Ref<string>;
  password: Ref<string>;
  timeoutMs: Ref<number>;
  scanRemote: Ref<boolean>;
  validateText: Ref<string>;
  validateOk: Ref<boolean>;
  embedUpdaterEnabled: Ref<boolean>;
  embedUpdaterIntervalDays: Ref<number>;
  loadedStorageSnapshot: Ref<string>;
  loadedEmbedUpdaterSnapshot: Ref<string>;
  clearFieldErrors: (key?: string) => void;
};

type StorageDraft = {
  mode: string;
  url: string;
  basePath: string;
  username: string;
  timeoutMs: number | null;
  scanRemote: boolean;
  hasPasswordInput: boolean;
};

function serializeStorageDraft(draft: StorageDraft): string {
  return JSON.stringify(draft);
}

function serializeEmbedUpdaterDraft(draft: { enabled: boolean; intervalDays: number | null }): string {
  return JSON.stringify(draft);
}

export function formatSystemDate(raw: string): string {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

export function createSystemWizardBindings(params: SystemWizardBindingsParams) {
  function buildStorageSnapshot(): string {
    return serializeStorageDraft({
      mode: normalizeUiMode(params.mode.value),
      url: String(params.url.value || "").trim(),
      basePath: String(params.basePath.value || "").trim(),
      username: String(params.username.value || "").trim(),
      timeoutMs: Number.isFinite(params.timeoutMs.value) ? Math.trunc(params.timeoutMs.value) : null,
      scanRemote: params.scanRemote.value === true,
      hasPasswordInput: Boolean(params.password.value),
    });
  }

  function buildEmbedUpdaterSnapshot(): string {
    return serializeEmbedUpdaterDraft({
      enabled: params.embedUpdaterEnabled.value === true,
      intervalDays: Number.isFinite(params.embedUpdaterIntervalDays.value)
        ? Math.trunc(params.embedUpdaterIntervalDays.value)
        : null,
    });
  }

  function markLoadedStorageSnapshot() {
    params.loadedStorageSnapshot.value = buildStorageSnapshot();
  }

  function markLoadedEmbedUpdaterSnapshot() {
    params.loadedEmbedUpdaterSnapshot.value = buildEmbedUpdaterSnapshot();
  }

  function applyStorage(nextStorage: unknown, options: { resetStep: boolean } = { resetStep: false }) {
    const s = (typeof nextStorage === "object" && nextStorage !== null)
      ? (nextStorage as Record<string, unknown>)
      : {};
    const webdavRaw = (typeof s.webdav === "object" && s.webdav !== null)
      ? (s.webdav as Record<string, unknown>)
      : {};
    const timeoutCandidate = Number(webdavRaw.timeoutMs);
    const normalizedTimeoutMs = Number.isFinite(timeoutCandidate) ? Math.trunc(timeoutCandidate) : 15000;

    params.storage.value = {
      mode: typeof s.mode === "string" ? s.mode : "local",
      effectiveMode: typeof s.effectiveMode === "string" ? s.effectiveMode : (typeof s.mode === "string" ? s.mode : "local"),
      readOnly: s.readOnly === true,
      localPath: typeof s.localPath === "string" ? s.localPath : "",
      lastSyncedAt: typeof s.lastSyncedAt === "string" ? s.lastSyncedAt : "",
      webdav: {
        url: typeof webdavRaw.url === "string" ? webdavRaw.url : "",
        basePath: typeof webdavRaw.basePath === "string" ? webdavRaw.basePath : "physicsAnimations",
        username: typeof webdavRaw.username === "string" ? webdavRaw.username : "",
        timeoutMs: normalizedTimeoutMs,
        hasPassword: webdavRaw.hasPassword === true,
        scanRemote: webdavRaw.scanRemote === true,
      },
    };

    const storage = params.storage.value!;
    const normalizedMode = normalizeUiMode(storage.mode || "local");
    if (!normalizedMode) throw new Error("invalid_storage_mode");

    params.mode.value = normalizedMode;
    params.url.value = storage.webdav.url || "";
    params.basePath.value = storage.webdav.basePath || "physicsAnimations";
    params.username.value = storage.webdav.username || "";
    params.timeoutMs.value = normalizedTimeoutMs;
    params.scanRemote.value = storage.webdav.scanRemote === true;
    params.password.value = "";
    params.validateText.value = "";
    params.validateOk.value = false;
    params.clearFieldErrors("webdavUrl");
    markLoadedStorageSnapshot();

    if (options.resetStep) params.wizardStep.value = 1;
  }

  function applyEmbedUpdater(nextEmbedUpdater: unknown) {
    const eu = (typeof nextEmbedUpdater === "object" && nextEmbedUpdater !== null)
      ? (nextEmbedUpdater as Record<string, unknown>)
      : {};
    const summary = (typeof eu.lastSummary === "object" && eu.lastSummary !== null)
      ? (eu.lastSummary as Record<string, unknown>)
      : {};
    const intervalCandidate = Number(eu.intervalDays);
    const intervalDays = Number.isFinite(intervalCandidate) ? Math.trunc(intervalCandidate) : 20;

    params.embedUpdater.value = {
      enabled: eu.enabled !== false,
      intervalDays,
      lastCheckedAt: typeof eu.lastCheckedAt === "string" ? eu.lastCheckedAt : "",
      lastRunAt: typeof eu.lastRunAt === "string" ? eu.lastRunAt : "",
      lastSuccessAt: typeof eu.lastSuccessAt === "string" ? eu.lastSuccessAt : "",
      lastError: typeof eu.lastError === "string" ? eu.lastError : "",
      nextRunAt: typeof eu.nextRunAt === "string" ? eu.nextRunAt : "",
      lastSummary: {
        status: typeof summary.status === "string" ? summary.status : "idle",
        ggbStatus: typeof summary.ggbStatus === "string" ? summary.ggbStatus : "",
        totalProfiles: Number.isFinite(Number(summary.totalProfiles)) ? Math.trunc(Number(summary.totalProfiles)) : 0,
        syncedProfiles: Number.isFinite(Number(summary.syncedProfiles)) ? Math.trunc(Number(summary.syncedProfiles)) : 0,
        skippedProfiles: Number.isFinite(Number(summary.skippedProfiles)) ? Math.trunc(Number(summary.skippedProfiles)) : 0,
        failedProfiles: Number.isFinite(Number(summary.failedProfiles)) ? Math.trunc(Number(summary.failedProfiles)) : 0,
      },
    };

    params.embedUpdaterEnabled.value = params.embedUpdater.value?.enabled ?? false;
    params.embedUpdaterIntervalDays.value = intervalDays;
    markLoadedEmbedUpdaterSnapshot();
  }

  return {
    buildStorageSnapshot,
    buildEmbedUpdaterSnapshot,
    applyStorage,
    applyEmbedUpdater,
  };
}
