import type { ComputedRef, Ref } from "vue";
import { getSystemInfo, updateSystemStorage, validateSystemStorage } from "../adminApi";
import { buildSystemUpdatePayload } from "../systemFormState";

type WizardStep = 1 | 2 | 3 | 4;

type SystemWizardActionsParams = {
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  validating: Ref<boolean>;
  syncing: Ref<boolean>;
  errorText: Ref<string>;
  successText: Ref<string>;
  validateText: Ref<string>;
  validateOk: Ref<boolean>;
  wizardStep: Ref<WizardStep>;
  mode: Ref<string>;
  url: Ref<string>;
  basePath: Ref<string>;
  username: Ref<string>;
  password: Ref<string>;
  timeoutMs: Ref<number>;
  scanRemote: Ref<boolean>;
  remoteMode: ComputedRef<boolean>;
  requiresWebdavUrl: ComputedRef<boolean>;
  readOnlyMode: ComputedRef<boolean>;
  canSyncNow: ComputedRef<boolean>;
  setFieldError: (key: string, message: string) => void;
  clearFieldErrors: (key?: string) => void;
  applyStorage: (nextStorage: any, options?: { resetStep: boolean }) => void;
};

function resolveAuthError(status?: number, fallbackText = "操作失败。"): string {
  return status === 401 ? "请先登录管理员账号。" : fallbackText;
}

export function createSystemWizardActions(ctx: SystemWizardActionsParams) {
  async function loadSystem(options: { resetStep: boolean } = { resetStep: true }) {
    ctx.loading.value = true;
    ctx.errorText.value = "";
    try {
      const data = await getSystemInfo();
      ctx.applyStorage(data?.storage || {}, { resetStep: options.resetStep });
    } catch (err) {
      const e = err as { status?: number };
      ctx.errorText.value = resolveAuthError(e?.status, "加载系统配置失败。");
    } finally {
      ctx.loading.value = false;
    }
  }

  async function runValidation() {
    if (!ctx.remoteMode.value) {
      ctx.validateOk.value = true;
      ctx.validateText.value = "local 模式无需 WebDAV 连接校验。";
      return;
    }
    if (!String(ctx.url.value || "").trim()) {
      ctx.setFieldError("webdavUrl", "请填写 WebDAV 地址。");
      ctx.errorText.value = "请填写 WebDAV 地址。";
      ctx.validateText.value = "";
      ctx.validateOk.value = false;
      return;
    }
    ctx.clearFieldErrors("webdavUrl");

    ctx.validating.value = true;
    ctx.errorText.value = "";
    ctx.validateText.value = "";
    ctx.validateOk.value = false;
    try {
      const webdavPayload: {
        url: string;
        basePath: string;
        username: string;
        password: string;
        timeoutMs?: number;
      } = {
        url: ctx.url.value,
        basePath: ctx.basePath.value,
        username: ctx.username.value,
        password: ctx.password.value,
      };
      const timeoutForValidation = Number(ctx.timeoutMs.value);
      if (Number.isFinite(timeoutForValidation)) {
        webdavPayload.timeoutMs = Math.trunc(timeoutForValidation);
      }

      await validateSystemStorage({
        webdav: webdavPayload,
      });
      ctx.validateOk.value = true;
      ctx.validateText.value = "连接校验通过。";
    } catch (err) {
      const e = err as { data?: any };
      const reason = String(e?.data?.reason || "").trim();
      if (e?.data?.error === "webdav_missing_url") {
        ctx.setFieldError("webdavUrl", "请填写 WebDAV 地址。");
        ctx.errorText.value = "请填写 WebDAV 地址。";
        return;
      }
      ctx.validateText.value = reason ? `连接校验失败：${reason}` : "连接校验失败，请检查地址和账号配置。";
      ctx.validateOk.value = false;
    } finally {
      ctx.validating.value = false;
    }
  }

  async function saveStorage() {
    if (ctx.requiresWebdavUrl.value && !String(ctx.url.value || "").trim()) {
      ctx.setFieldError("webdavUrl", "请填写 WebDAV 地址。");
      ctx.errorText.value = "请填写 WebDAV 地址。";
      return;
    }
    ctx.clearFieldErrors("webdavUrl");
    if (ctx.readOnlyMode.value) {
      ctx.errorText.value = "当前为只读模式，无法保存配置。";
      return;
    }

    ctx.saving.value = true;
    ctx.errorText.value = "";
    ctx.successText.value = "";
    try {
      const payload = buildSystemUpdatePayload({
        mode: ctx.mode.value,
        url: ctx.url.value,
        basePath: ctx.basePath.value,
        username: ctx.username.value,
        password: ctx.password.value,
        timeoutRaw: Number.isFinite(ctx.timeoutMs.value) ? String(Math.trunc(ctx.timeoutMs.value)) : "",
        scanRemote: ctx.scanRemote.value,
        sync: false,
      });
      const data = await updateSystemStorage(payload);
      if (data?.storage) ctx.applyStorage(data.storage, { resetStep: false });
      else await loadSystem({ resetStep: false });

      ctx.successText.value = "系统配置已保存。";
      ctx.wizardStep.value = 4;
    } catch (err) {
      const e = err as { status?: number; data?: any };
      if (e?.data?.error === "webdav_missing_url") {
        ctx.setFieldError("webdavUrl", "请填写 WebDAV 地址。");
        ctx.errorText.value = "请填写 WebDAV 地址。";
        return;
      }
      ctx.errorText.value = resolveAuthError(e?.status, "保存系统配置失败。");
    } finally {
      ctx.saving.value = false;
    }
  }

  async function syncNow() {
    if (!ctx.canSyncNow.value) return;

    ctx.syncing.value = true;
    ctx.errorText.value = "";
    ctx.successText.value = "";
    try {
      const data = await updateSystemStorage({
        mode: ctx.mode.value,
        sync: true,
        webdav: { scanRemote: ctx.scanRemote.value },
      });
      if (data?.storage) ctx.applyStorage(data.storage, { resetStep: false });
      else await loadSystem({ resetStep: false });

      ctx.successText.value = "同步完成。";
    } catch (err) {
      const e = err as { status?: number };
      ctx.errorText.value = resolveAuthError(e?.status, "同步失败。");
    } finally {
      ctx.syncing.value = false;
    }
  }

  return {
    loadSystem,
    runValidation,
    saveStorage,
    syncNow,
  };
}
