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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (nextStorage as Record<string, any> | null) || {};
    const timeoutCandidate = Number(s.webdav?.timeoutMs);
    const normalizedTimeoutMs = Number.isFinite(timeoutCandidate) ? Math.trunc(timeoutCandidate) : 15000;

    params.storage.value = {
      mode: s.mode || "local",
      effectiveMode: s.effectiveMode || s.mode || "local",
      readOnly: s.readOnly === true,
      localPath: s.localPath || "",
      lastSyncedAt: s.lastSyncedAt || "",
      webdav: {
        url: s.webdav?.url || "",
        basePath: s.webdav?.basePath || "physicsAnimations",
        username: s.webdav?.username || "",
        timeoutMs: normalizedTimeoutMs,
        hasPassword: s.webdav?.hasPassword === true,
        scanRemote: s.webdav?.scanRemote === true,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eu = (nextEmbedUpdater as Record<string, any> | null) || {};
    const summary = eu.lastSummary && typeof eu.lastSummary === "object" ? eu.lastSummary : {};
    const intervalCandidate = Number(eu.intervalDays);
    const intervalDays = Number.isFinite(intervalCandidate) ? Math.trunc(intervalCandidate) : 20;

    params.embedUpdater.value = {
      enabled: eu.enabled !== false,
      intervalDays,
      lastCheckedAt: eu.lastCheckedAt || "",
      lastRunAt: eu.lastRunAt || "",
      lastSuccessAt: eu.lastSuccessAt || "",
      lastError: eu.lastError || "",
      nextRunAt: eu.nextRunAt || "",
      lastSummary: {
        status: summary.status || "idle",
        ggbStatus: summary.ggbStatus || "",
        totalProfiles: Number.isFinite(summary.totalProfiles) ? Math.trunc(summary.totalProfiles) : 0,
        syncedProfiles: Number.isFinite(summary.syncedProfiles) ? Math.trunc(summary.syncedProfiles) : 0,
        skippedProfiles: Number.isFinite(summary.skippedProfiles) ? Math.trunc(summary.skippedProfiles) : 0,
        failedProfiles: Number.isFinite(summary.failedProfiles) ? Math.trunc(summary.failedProfiles) : 0,
      },
    };

    params.embedUpdaterEnabled.value = params.embedUpdater.value!.enabled;
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
