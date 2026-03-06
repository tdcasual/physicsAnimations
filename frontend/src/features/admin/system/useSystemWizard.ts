import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import {
  canRunManualSync,
  isRemoteMode,
  normalizeUiMode,
  shouldRequireWebdavUrl,
} from "../systemFormState";
import { useFieldErrors } from "../composables/useFieldErrors";
import { createSystemWizardActions } from "./useSystemWizardActions";
export interface SystemStorage {
  mode: string;
  effectiveMode: string;
  readOnly: boolean;
  localPath: string;
  lastSyncedAt: string;
  webdav: {
    url: string;
    basePath: string;
    username: string;
    timeoutMs: number;
    hasPassword: boolean;
    scanRemote: boolean;
  };
}

export interface SystemEmbedUpdaterSummary {
  status: string;
  ggbStatus: string;
  totalProfiles: number;
  syncedProfiles: number;
  skippedProfiles: number;
  failedProfiles: number;
}

export interface SystemEmbedUpdater {
  enabled: boolean;
  intervalDays: number;
  lastCheckedAt: string;
  lastRunAt: string;
  lastSuccessAt: string;
  lastError: string;
  nextRunAt: string;
  lastSummary: SystemEmbedUpdaterSummary;
}

type WizardStep = 1 | 2 | 3 | 4;
export function useSystemWizard() {
  const steps: Array<{ id: WizardStep; title: string; hint: string }> = [
    { id: 1, title: "1. 选择模式", hint: "决定存储架构" },
    { id: 2, title: "2. 连接配置", hint: "填写本地或 WebDAV 信息" },
    { id: 3, title: "3. 校验与保存", hint: "验证连接并保存配置" },
    { id: 4, title: "4. 启用同步", hint: "执行首次同步并检查状态" },
  ];

  const loading = ref(false);
  const saving = ref(false);
  const validating = ref(false);
  const syncing = ref(false);
  const savingEmbedUpdater = ref(false);

  const errorText = ref("");
  const successText = ref("");
  const validateText = ref("");
  const validateOk = ref(false);
  const embedUpdaterErrorText = ref("");
  const embedUpdaterSuccessText = ref("");
  const { fieldErrors, setFieldError, clearFieldErrors, getFieldError } = useFieldErrors();

  const storage = ref<SystemStorage | null>(null);
  const embedUpdater = ref<SystemEmbedUpdater | null>(null);
  const wizardStep = ref<WizardStep>(1);

  const mode = ref("local");
  const url = ref("");
  const basePath = ref("physicsAnimations");
  const username = ref("");
  const password = ref("");
  const timeoutMs = ref(15000);
  const scanRemote = ref(false);
  const embedUpdaterEnabled = ref(true);
  const embedUpdaterIntervalDays = ref(20);

  const loadedStorageSnapshot = ref("");
  const loadedEmbedUpdaterSnapshot = ref("");

  const remoteMode = computed(() => isRemoteMode(mode.value));
  const requiresWebdavUrl = computed(() => shouldRequireWebdavUrl(mode.value));
  const readOnlyMode = computed(() => storage.value?.readOnly === true);

  const hasStorageUnsavedChanges = computed(() => buildStorageSnapshot() !== loadedStorageSnapshot.value);
  const hasEmbedUpdaterUnsavedChanges = computed(() => buildEmbedUpdaterSnapshot() !== loadedEmbedUpdaterSnapshot.value);
  const hasUnsavedChanges = computed(() => hasStorageUnsavedChanges.value || hasEmbedUpdaterUnsavedChanges.value);

  const canSyncNow = computed(
    () => canRunManualSync({ mode: mode.value, url: url.value }) && !hasStorageUnsavedChanges.value && !readOnlyMode.value,
  );

  const syncHint = computed(() => {
    if (readOnlyMode.value) return "当前为只读模式，无法执行同步。";
    if (!remoteMode.value) return "local 模式不执行 WebDAV 同步。";
    if (!String(url.value || "").trim()) return "请先填写 WebDAV URL。";
    if (hasStorageUnsavedChanges.value) return "存在未保存改动，请先保存配置。";
    return "";
  });

  const saveDisabledHint = computed(() => {
    if (wizardStep.value !== 3) return "";
    if (saving.value) return "正在保存配置，请稍候。";
    if (readOnlyMode.value) return "当前为只读模式，无法保存配置。";
    return "";
  });
  const continueDisabledHint = computed(() => {
    if (wizardStep.value !== 3) return "";
    if (hasStorageUnsavedChanges.value) return "请先保存配置后再继续下一步。";
    return "";
  });
  const embedUpdaterSaveHint = computed(() => {
    if (savingEmbedUpdater.value) return "正在保存自动更新设置，请稍候。";
    const intervalDays = Number(embedUpdaterIntervalDays.value);
    if (!Number.isFinite(intervalDays) || !Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 365) {
      return "更新周期需为 1-365 天的整数。";
    }
    return "";
  });

  function formatDate(raw: string): string {
    if (!raw) return "-";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleString();
  }

  function buildStorageSnapshot(): string {
    return JSON.stringify({
      mode: normalizeUiMode(mode.value),
      url: String(url.value || "").trim(),
      basePath: String(basePath.value || "").trim(),
      username: String(username.value || "").trim(),
      timeoutMs: Number.isFinite(timeoutMs.value) ? Math.trunc(timeoutMs.value) : null,
      scanRemote: scanRemote.value === true,
      hasPasswordInput: Boolean(password.value),
    });
  }

  function buildEmbedUpdaterSnapshot(): string {
    return JSON.stringify({
      enabled: embedUpdaterEnabled.value === true,
      intervalDays: Number.isFinite(embedUpdaterIntervalDays.value) ? Math.trunc(embedUpdaterIntervalDays.value) : null,
    });
  }

  function markLoadedStorageSnapshot() {
    loadedStorageSnapshot.value = buildStorageSnapshot();
  }

  function markLoadedEmbedUpdaterSnapshot() {
    loadedEmbedUpdaterSnapshot.value = buildEmbedUpdaterSnapshot();
  }

  function applyStorage(nextStorage: any, options: { resetStep: boolean } = { resetStep: false }) {
    const timeoutCandidate = Number(nextStorage?.webdav?.timeoutMs);
    const normalizedTimeoutMs = Number.isFinite(timeoutCandidate) ? Math.trunc(timeoutCandidate) : 15000;

    storage.value = {
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

    const normalizedMode = normalizeUiMode(storage.value.mode || "local");
    if (!normalizedMode) {
      throw new Error("invalid_storage_mode");
    }
    mode.value = normalizedMode;
    url.value = storage.value.webdav.url || "";
    basePath.value = storage.value.webdav.basePath || "physicsAnimations";
    username.value = storage.value.webdav.username || "";
    timeoutMs.value = normalizedTimeoutMs;
    scanRemote.value = storage.value.webdav.scanRemote === true;
    password.value = "";
    validateText.value = "";
    validateOk.value = false;
    clearFieldErrors("webdavUrl");
    markLoadedStorageSnapshot();

    if (options.resetStep) wizardStep.value = 1;
  }

  function applyEmbedUpdater(nextEmbedUpdater: any) {
    const summary = nextEmbedUpdater?.lastSummary && typeof nextEmbedUpdater.lastSummary === "object" ? nextEmbedUpdater.lastSummary : {};
    const intervalCandidate = Number(nextEmbedUpdater?.intervalDays);
    const intervalDays = Number.isFinite(intervalCandidate) ? Math.trunc(intervalCandidate) : 20;

    embedUpdater.value = {
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

    embedUpdaterEnabled.value = embedUpdater.value.enabled;
    embedUpdaterIntervalDays.value = intervalDays;
    markLoadedEmbedUpdaterSnapshot();
  }

  function onModeChanged() {
    successText.value = "";
    validateText.value = "";
    validateOk.value = false;
    if (!shouldRequireWebdavUrl(mode.value)) {
      clearFieldErrors("webdavUrl");
    }
    if (wizardStep.value > 2) wizardStep.value = 2;
  }

  function goStep(step: WizardStep) {
    wizardStep.value = step;
  }

  function nextFromMode() {
    errorText.value = "";
    wizardStep.value = remoteMode.value ? 2 : 3;
  }

  function nextFromConnection() {
    errorText.value = "";
    if (requiresWebdavUrl.value && !String(url.value || "").trim()) {
      setFieldError("webdavUrl", "请填写 WebDAV 地址。");
      errorText.value = "请填写 WebDAV 地址。";
      return;
    }
    clearFieldErrors("webdavUrl");
    wizardStep.value = 3;
  }

  const { loadSystem, runValidation, saveStorage, saveEmbedUpdater, syncNow } = createSystemWizardActions({
    loading,
    saving,
    validating,
    syncing,
    savingEmbedUpdater,
    errorText,
    successText,
    validateText,
    validateOk,
    embedUpdaterErrorText,
    embedUpdaterSuccessText,
    wizardStep,
    mode,
    url,
    basePath,
    username,
    password,
    timeoutMs,
    scanRemote,
    embedUpdaterEnabled,
    embedUpdaterIntervalDays,
    remoteMode,
    requiresWebdavUrl,
    readOnlyMode,
    canSyncNow,
    setFieldError,
    clearFieldErrors,
    applyStorage,
    applyEmbedUpdater,
  });

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasUnsavedChanges.value || saving.value || syncing.value || savingEmbedUpdater.value) return;
    event.preventDefault();
    event.returnValue = "";
  }

  onBeforeRouteLeave(() => {
    if (!hasUnsavedChanges.value || saving.value || syncing.value || savingEmbedUpdater.value) return true;
    return window.confirm("系统设置有未保存更改，确定离开当前页面吗？");
  });

  onMounted(async () => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    await loadSystem({ resetStep: true });
  });

  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  return {
    steps,
    loading,
    saving,
    validating,
    syncing,
    savingEmbedUpdater,
    errorText,
    successText,
    validateText,
    validateOk,
    embedUpdaterErrorText,
    embedUpdaterSuccessText,
    fieldErrors,
    getFieldError,
    clearFieldErrors,
    storage,
    embedUpdater,
    wizardStep,
    mode,
    url,
    basePath,
    username,
    password,
    timeoutMs,
    scanRemote,
    embedUpdaterEnabled,
    embedUpdaterIntervalDays,
    remoteMode,
    requiresWebdavUrl,
    readOnlyMode,
    canSyncNow,
    syncHint,
    hasStorageUnsavedChanges,
    hasEmbedUpdaterUnsavedChanges,
    hasUnsavedChanges,
    saveDisabledHint,
    continueDisabledHint,
    embedUpdaterSaveHint,
    formatDate,
    onModeChanged,
    goStep,
    nextFromMode,
    nextFromConnection,
    runValidation,
    saveStorage,
    saveEmbedUpdater,
    syncNow,
  };
}
