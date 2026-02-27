<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { getSystemInfo, updateSystemStorage, validateSystemStorage } from "../../features/admin/adminApi";
import {
  buildSystemUpdatePayload,
  canRunManualSync,
  isRemoteMode,
  normalizeUiMode,
  shouldRequireWebdavUrl,
} from "../../features/admin/systemFormState";

interface SystemStorage {
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

type WizardStep = 1 | 2 | 3 | 4;

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

const errorText = ref("");
const successText = ref("");
const validateText = ref("");
const validateOk = ref(false);

const storage = ref<SystemStorage | null>(null);
const wizardStep = ref<WizardStep>(1);

const mode = ref("local");
const url = ref("");
const basePath = ref("physicsAnimations");
const username = ref("");
const password = ref("");
const timeoutMs = ref(15000);
const scanRemote = ref(false);

const loadedSnapshot = ref("");

const remoteMode = computed(() => isRemoteMode(mode.value));
const requiresWebdavUrl = computed(() => shouldRequireWebdavUrl(mode.value));
const readOnlyMode = computed(() => storage.value?.readOnly === true);

const canSyncNow = computed(
  () => canRunManualSync({ mode: mode.value, url: url.value }) && !hasUnsavedChanges.value && !readOnlyMode.value,
);

const syncHint = computed(() => {
  if (readOnlyMode.value) return "当前为只读模式，无法执行同步。";
  if (!remoteMode.value) return "local 模式不执行 WebDAV 同步。";
  if (!String(url.value || "").trim()) return "请先填写 WebDAV URL。";
  if (hasUnsavedChanges.value) return "存在未保存改动，请先保存配置。";
  return "";
});

const hasUnsavedChanges = computed(() => buildFormSnapshot() !== loadedSnapshot.value);
const saveDisabledHint = computed(() => {
  if (wizardStep.value !== 3) return "";
  if (saving.value) return "正在保存配置，请稍候。";
  if (readOnlyMode.value) return "当前为只读模式，无法保存配置。";
  return "";
});
const continueDisabledHint = computed(() => {
  if (wizardStep.value !== 3) return "";
  if (hasUnsavedChanges.value) return "请先保存配置后再继续下一步。";
  return "";
});

function formatDate(raw: string): string {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

function buildFormSnapshot(): string {
  return JSON.stringify({
    mode: normalizeUiMode(mode.value),
    url: String(url.value || "").trim(),
    basePath: String(basePath.value || "").trim(),
    username: String(username.value || "").trim(),
    timeoutMs: Number(timeoutMs.value || 0),
    scanRemote: scanRemote.value === true,
    hasPasswordInput: Boolean(password.value),
  });
}

function markLoadedSnapshot() {
  loadedSnapshot.value = buildFormSnapshot();
}

function applyStorage(nextStorage: any, options: { resetStep: boolean } = { resetStep: false }) {
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
      timeoutMs: Number(nextStorage?.webdav?.timeoutMs || 15000),
      hasPassword: nextStorage?.webdav?.hasPassword === true,
      scanRemote: nextStorage?.webdav?.scanRemote === true,
    },
  };

  mode.value = normalizeUiMode(storage.value.mode || "local");
  url.value = storage.value.webdav.url || "";
  basePath.value = storage.value.webdav.basePath || "physicsAnimations";
  username.value = storage.value.webdav.username || "";
  timeoutMs.value = Number(storage.value.webdav.timeoutMs || 15000);
  scanRemote.value = storage.value.webdav.scanRemote === true;
  password.value = "";
  validateText.value = "";
  validateOk.value = false;
  markLoadedSnapshot();

  if (options.resetStep) wizardStep.value = 1;
}

async function loadSystem(options: { resetStep: boolean } = { resetStep: true }) {
  loading.value = true;
  errorText.value = "";
  try {
    const data = await getSystemInfo();
    applyStorage(data?.storage || {}, { resetStep: options.resetStep });
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "加载系统配置失败。";
  } finally {
    loading.value = false;
  }
}

function onModeChanged() {
  successText.value = "";
  validateText.value = "";
  validateOk.value = false;
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
    errorText.value = "请填写 WebDAV 地址。";
    return;
  }
  wizardStep.value = 3;
}

async function runValidation() {
  if (!remoteMode.value) {
    validateOk.value = true;
    validateText.value = "local 模式无需 WebDAV 连接校验。";
    return;
  }
  if (!String(url.value || "").trim()) {
    errorText.value = "请填写 WebDAV 地址。";
    return;
  }

  validating.value = true;
  errorText.value = "";
  validateText.value = "";
  validateOk.value = false;
  try {
    await validateSystemStorage({
      webdav: {
        url: url.value,
        basePath: basePath.value,
        username: username.value,
        password: password.value,
        timeoutMs: timeoutMs.value,
      },
    });
    validateOk.value = true;
    validateText.value = "连接校验通过。";
  } catch (err) {
    const e = err as { status?: number; data?: any };
    const reason = String(e?.data?.reason || "").trim();
    if (e?.data?.error === "webdav_missing_url") {
      errorText.value = "请填写 WebDAV 地址。";
      return;
    }
    validateText.value = reason ? `连接校验失败：${reason}` : "连接校验失败，请检查地址和账号配置。";
    validateOk.value = false;
  } finally {
    validating.value = false;
  }
}

async function saveStorage() {
  if (requiresWebdavUrl.value && !String(url.value || "").trim()) {
    errorText.value = "请填写 WebDAV 地址。";
    return;
  }
  if (readOnlyMode.value) {
    errorText.value = "当前为只读模式，无法保存配置。";
    return;
  }

  saving.value = true;
  errorText.value = "";
  successText.value = "";
  try {
    const payload = buildSystemUpdatePayload({
      mode: mode.value,
      url: url.value,
      basePath: basePath.value,
      username: username.value,
      password: password.value,
      timeoutRaw: String(timeoutMs.value ?? ""),
      scanRemote: scanRemote.value,
      sync: false,
    });
    const data = await updateSystemStorage(payload);
    if (data?.storage) applyStorage(data.storage, { resetStep: false });
    else await loadSystem({ resetStep: false });

    successText.value = "系统配置已保存。";
    wizardStep.value = 4;
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.data?.error === "webdav_missing_url") {
      errorText.value = "请填写 WebDAV 地址。";
      return;
    }
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "保存系统配置失败。";
  } finally {
    saving.value = false;
  }
}

async function syncNow() {
  if (!canSyncNow.value) return;

  syncing.value = true;
  errorText.value = "";
  successText.value = "";
  try {
    const data = await updateSystemStorage({
      mode: mode.value,
      sync: true,
      webdav: { scanRemote: scanRemote.value },
    });
    if (data?.storage) applyStorage(data.storage, { resetStep: false });
    else await loadSystem({ resetStep: false });

    successText.value = "同步完成。";
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "同步失败。";
  } finally {
    syncing.value = false;
  }
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasUnsavedChanges.value || saving.value || syncing.value) return;
  event.preventDefault();
  event.returnValue = "";
}

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value || saving.value || syncing.value) return true;
  return window.confirm("系统设置有未保存更改，确定离开当前页面吗？");
});

onMounted(async () => {
  window.addEventListener("beforeunload", handleBeforeUnload);
  await loadSystem({ resetStep: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>

<template>
  <section class="admin-system-view">
    <h2>系统设置向导</h2>

    <div v-if="errorText" class="error-text admin-feedback error">{{ errorText }}</div>
    <div v-if="successText" class="success-text admin-feedback success">{{ successText }}</div>

    <div class="panel admin-card">
      <h3>当前状态</h3>
      <div v-if="loading" class="empty">加载中...</div>
      <div v-else-if="storage" class="status-grid">
        <div><span>配置模式：</span>{{ storage.mode }}</div>
        <div><span>实际模式：</span>{{ storage.effectiveMode }}</div>
        <div><span>本地路径：</span>{{ storage.localPath || "-" }}</div>
        <div><span>WebDAV URL：</span>{{ storage.webdav.url || "-" }}</div>
        <div><span>WebDAV Base Path：</span>{{ storage.webdav.basePath || "-" }}</div>
        <div><span>WebDAV 用户：</span>{{ storage.webdav.username || "-" }}</div>
        <div><span>WebDAV 密码：</span>{{ storage.webdav.hasPassword ? "已配置" : "未配置" }}</div>
        <div><span>上次同步：</span>{{ formatDate(storage.lastSyncedAt) }}</div>
      </div>
    </div>

    <div class="panel admin-card">
      <h3>配置流程</h3>
      <ol class="step-list">
        <li v-for="item in steps" :key="item.id" class="step-item">
          <button
            type="button"
            class="step-button"
            :class="{ active: wizardStep === item.id, done: wizardStep > item.id }"
            @click="goStep(item.id)"
          >
            {{ item.title }}
          </button>
          <div class="step-hint">{{ item.hint }}</div>
        </li>
      </ol>

      <div v-if="wizardStep === 1" class="wizard-panel">
        <h4>选择模式</h4>
        <div class="mode-grid">
          <label class="mode-card" :class="{ active: mode === 'local' }">
            <input v-model="mode" type="radio" value="local" @change="onModeChanged" />
            <strong>local</strong>
            <span>仅使用本地目录存储，配置简单，离线可用。</span>
          </label>
          <label class="mode-card" :class="{ active: mode === 'hybrid' }">
            <input v-model="mode" type="radio" value="hybrid" @change="onModeChanged" />
            <strong>hybrid</strong>
            <span>本地读写为主，同时同步到 WebDAV，兼顾可靠性和备份。</span>
          </label>
          <label class="mode-card" :class="{ active: mode === 'webdav' }">
            <input v-model="mode" type="radio" value="webdav" @change="onModeChanged" />
            <strong>webdav</strong>
            <span>直接使用 WebDAV 作为主存储，适合集中化部署场景。</span>
          </label>
        </div>

        <div class="actions admin-actions">
          <button type="button" class="btn btn-primary" :disabled="loading" @click="nextFromMode">下一步</button>
        </div>
      </div>

      <div v-else-if="wizardStep === 2" class="wizard-panel">
        <h4>连接配置</h4>

        <div v-if="remoteMode" class="form-grid">
          <label class="field">
            <span>WebDAV URL</span>
            <input
              v-model="url"
              class="field-input"
              type="url"
              name="webdav_url"
              autocomplete="url"
              placeholder="https://example.com/dav/"
            />
          </label>

          <label class="field">
            <span>WebDAV Base Path</span>
            <input v-model="basePath" class="field-input" type="text" name="webdav_base_path" autocomplete="off" />
          </label>

          <label class="field">
            <span>WebDAV 用户名</span>
            <input v-model="username" class="field-input" type="text" name="webdav_username" autocomplete="username" />
          </label>

          <label class="field">
            <span>WebDAV 密码（留空表示不更新）</span>
            <input
              v-model="password"
              class="field-input"
              type="password"
              name="webdav_password"
              autocomplete="current-password"
            />
          </label>

          <label class="field">
            <span>超时（毫秒）</span>
            <input
              v-model.number="timeoutMs"
              class="field-input"
              type="number"
              name="webdav_timeout_ms"
              autocomplete="off"
              min="1000"
            />
          </label>

          <label class="checkbox">
            <input v-model="scanRemote" type="checkbox" />
            <span>同步时扫描远端目录</span>
          </label>
        </div>

        <div v-else class="empty">local 模式无需 WebDAV 配置，下一步可直接保存。</div>

        <div class="actions admin-actions">
          <button type="button" class="btn btn-ghost" @click="goStep(1)">上一步</button>
          <button type="button" class="btn btn-primary" @click="nextFromConnection">下一步</button>
        </div>
      </div>

      <div v-else-if="wizardStep === 3" class="wizard-panel">
        <h4>校验与保存</h4>

        <div class="summary-grid">
          <div><span>模式：</span>{{ mode }}</div>
          <div><span>URL：</span>{{ remoteMode ? (url || "-") : "-" }}</div>
          <div><span>Base Path：</span>{{ remoteMode ? (basePath || "-") : "-" }}</div>
          <div><span>用户：</span>{{ remoteMode ? (username || "-") : "-" }}</div>
          <div><span>超时：</span>{{ remoteMode ? `${timeoutMs}ms` : "-" }}</div>
        </div>

        <div v-if="validateText" class="validate-text" :class="{ ok: validateOk }">{{ validateText }}</div>
        <div v-if="hasUnsavedChanges" class="pending-text">存在未保存改动。</div>
        <div v-if="saveDisabledHint" class="save-disabled-hint admin-feedback">{{ saveDisabledHint }}</div>
        <div v-if="continueDisabledHint" class="continue-disabled-hint admin-feedback">{{ continueDisabledHint }}</div>

        <div class="actions admin-actions">
          <button type="button" class="btn btn-ghost" @click="goStep(2)">上一步</button>
          <button
            v-if="remoteMode"
            type="button"
            class="btn btn-ghost"
            :disabled="validating || readOnlyMode"
            @click="runValidation"
          >
            {{ validating ? "校验中..." : "测试连接" }}
          </button>
          <button type="button" class="btn btn-primary" :disabled="saving || readOnlyMode" @click="saveStorage">
            {{ saving ? "保存中..." : "保存配置" }}
          </button>
          <button type="button" class="btn btn-ghost" :disabled="hasUnsavedChanges" @click="goStep(4)">下一步</button>
        </div>
      </div>

      <div v-else class="wizard-panel">
        <h4>启用与同步</h4>

        <div v-if="remoteMode" class="sync-box">
          <div class="sync-hint" v-if="syncHint">{{ syncHint }}</div>
          <button type="button" class="btn btn-primary" :disabled="syncing || !canSyncNow" @click="syncNow">
            {{ syncing ? "同步中..." : "立即同步" }}
          </button>
        </div>

        <div v-else class="empty">local 模式已生效，无需远端同步。</div>

        <div class="actions admin-actions">
          <button type="button" class="btn btn-ghost" @click="goStep(3)">上一步</button>
          <button type="button" class="btn btn-ghost" @click="goStep(1)">重新配置</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-system-view {
  display: grid;
  gap: 12px;
}

h2 {
  margin: 0;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
  display: grid;
  gap: 10px;
}

h3 {
  margin: 0;
  font-size: 16px;
}

h4 {
  margin: 0;
  font-size: 15px;
}

.status-grid {
  display: grid;
  gap: 6px;
}

.status-grid > div {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.status-grid span,
.summary-grid span {
  color: var(--muted);
}

.step-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.step-item {
  display: grid;
  gap: 4px;
}

.step-button {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 7px 10px;
  background: color-mix(in srgb, var(--surface) 92%, var(--bg));
  color: inherit;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
}

.step-button.active {
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
  background: color-mix(in srgb, var(--primary) 15%, var(--surface));
}

.step-button.done {
  background: color-mix(in srgb, var(--primary) 11%, var(--surface));
}

.step-hint {
  font-size: 12px;
  color: var(--muted);
}

.wizard-panel {
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 10px;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.mode-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px;
  display: grid;
  gap: 6px;
  cursor: pointer;
  background: color-mix(in srgb, var(--surface) 94%, var(--bg));
}

.mode-card input {
  margin: 0;
}

.mode-card.active {
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
  background: color-mix(in srgb, var(--primary) 10%, var(--surface));
}

.mode-card span {
  color: var(--muted);
  font-size: 13px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.summary-grid {
  display: grid;
  gap: 6px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.sync-box {
  display: grid;
  gap: 8px;
}

.sync-hint,
.pending-text,
.validate-text,
.save-disabled-hint,
.continue-disabled-hint {
  font-size: 13px;
  color: var(--muted);
}

.validate-text.ok {
  color: #15803d;
}

.empty {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 14px;
  color: var(--muted);
}

.error-text {
  color: var(--danger);
  font-size: 13px;
}

.success-text {
  color: #15803d;
  font-size: 13px;
}

@media (max-width: 640px) {
  .step-list {
    grid-template-columns: 1fr;
  }

  .mode-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
