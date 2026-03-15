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

  function applyStorage(nextStorage: any, options: { resetStep: boolean } = { resetStep: false }) {
    const timeoutCandidate = Number(nextStorage?.webdav?.timeoutMs);
    const normalizedTimeoutMs = Number.isFinite(timeoutCandidate) ? Math.trunc(timeoutCandidate) : 15000;

    params.storage.value = {
      mode: nextStorage?.mode || "local",
      effectiveMode: nextStorage?.effectiveMode || nextStorage?.mode || "local",
      readOnly: nextStorage?.readOnly === true,
      localPath: nextStorage?.localPath || "",
      lastSyncedAt: nextStorage?.lastSyncedAt || "",
      webdav: {
        url: nextStorage?.webdav?.url || "",
        basePath: nextStorage?.webdav?.basePath || "physicsAnimations",
        username: nextStorage?.webdav?.username || "",
        timeoutMs: normalizedTimeoutMs,
        hasPassword: nextStorage?.webdav?.hasPassword === true,
        scanRemote: nextStorage?.webdav?.scanRemote === true,
      },
    };

    const normalizedMode = normalizeUiMode(params.storage.value.mode || "local");
    if (!normalizedMode) throw new Error("invalid_storage_mode");

    params.mode.value = normalizedMode;
    params.url.value = params.storage.value.webdav.url || "";
    params.basePath.value = params.storage.value.webdav.basePath || "physicsAnimations";
    params.username.value = params.storage.value.webdav.username || "";
    params.timeoutMs.value = normalizedTimeoutMs;
    params.scanRemote.value = params.storage.value.webdav.scanRemote === true;
    params.password.value = "";
    params.validateText.value = "";
    params.validateOk.value = false;
    params.clearFieldErrors("webdavUrl");
    markLoadedStorageSnapshot();

    if (options.resetStep) params.wizardStep.value = 1;
  }

  function applyEmbedUpdater(nextEmbedUpdater: any) {
    const summary =
      nextEmbedUpdater?.lastSummary && typeof nextEmbedUpdater.lastSummary === "object" ? nextEmbedUpdater.lastSummary : {};
    const intervalCandidate = Number(nextEmbedUpdater?.intervalDays);
    const intervalDays = Number.isFinite(intervalCandidate) ? Math.trunc(intervalCandidate) : 20;

    params.embedUpdater.value = {
      enabled: nextEmbedUpdater?.enabled !== false,
      intervalDays,
      lastCheckedAt: nextEmbedUpdater?.lastCheckedAt || "",
      lastRunAt: nextEmbedUpdater?.lastRunAt || "",
      lastSuccessAt: nextEmbedUpdater?.lastSuccessAt || "",
      lastError: nextEmbedUpdater?.lastError || "",
      nextRunAt: nextEmbedUpdater?.nextRunAt || "",
      lastSummary: {
        status: summary?.status || "idle",
        ggbStatus: summary?.ggbStatus || "",
        totalProfiles: Number.isFinite(summary?.totalProfiles) ? Math.trunc(summary.totalProfiles) : 0,
        syncedProfiles: Number.isFinite(summary?.syncedProfiles) ? Math.trunc(summary.syncedProfiles) : 0,
        skippedProfiles: Number.isFinite(summary?.skippedProfiles) ? Math.trunc(summary.skippedProfiles) : 0,
        failedProfiles: Number.isFinite(summary?.failedProfiles) ? Math.trunc(summary.failedProfiles) : 0,
      },
    };

    params.embedUpdaterEnabled.value = params.embedUpdater.value.enabled;
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
