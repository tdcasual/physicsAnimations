<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getSystemInfo, updateSystemStorage } from "../../features/admin/adminApi";
import {
  buildSystemUpdatePayload,
  normalizeUiMode,
  shouldAutoEnableSyncOnSave,
  shouldRequireWebdavUrl,
} from "../../features/admin/systemFormState";

interface SystemStorage {
  mode: string;
  effectiveMode: string;
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

const loading = ref(false);
const saving = ref(false);
const errorText = ref("");
const successText = ref("");

const storage = ref<SystemStorage | null>(null);

const mode = ref("local");
const url = ref("");
const basePath = ref("physicsAnimations");
const username = ref("");
const password = ref("");
const timeoutMs = ref(15000);
const scanRemote = ref(false);
const syncOnSave = ref(false);
const loadedMode = ref("local");

const canSyncNow = computed(() => Boolean(url.value.trim()));

function formatDate(raw: string): string {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

async function loadSystem() {
  loading.value = true;
  errorText.value = "";
  try {
    const data = await getSystemInfo();
    const nextStorage = (data?.storage || {}) as any;
    storage.value = {
      mode: nextStorage.mode || "local",
      effectiveMode: nextStorage.effectiveMode || nextStorage.mode || "local",
      localPath: nextStorage.localPath || "",
      lastSyncedAt: nextStorage.lastSyncedAt || "",
      webdav: {
        url: nextStorage.webdav?.url || "",
        basePath: nextStorage.webdav?.basePath || "physicsAnimations",
        username: nextStorage.webdav?.username || "",
        timeoutMs: Number(nextStorage.webdav?.timeoutMs || 15000),
        hasPassword: nextStorage.webdav?.hasPassword === true,
        scanRemote: nextStorage.webdav?.scanRemote === true,
      },
    };

    const uiMode = normalizeUiMode(storage.value.mode || "local");
    loadedMode.value = uiMode;
    mode.value = uiMode;
    url.value = storage.value.webdav.url || "";
    basePath.value = storage.value.webdav.basePath || "physicsAnimations";
    username.value = storage.value.webdav.username || "";
    timeoutMs.value = Number(storage.value.webdav.timeoutMs || 15000);
    scanRemote.value = storage.value.webdav.scanRemote === true;
    password.value = "";
    syncOnSave.value = false;
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "加载系统配置失败。";
  } finally {
    loading.value = false;
  }
}

function handleModeChange() {
  if (shouldAutoEnableSyncOnSave({ loadedMode: loadedMode.value, nextMode: mode.value })) {
    syncOnSave.value = true;
  }
}

async function saveStorage() {
  if (shouldRequireWebdavUrl(mode.value) && !url.value.trim()) {
    errorText.value = "请填写 WebDAV 地址。";
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
      sync: syncOnSave.value,
    });
    await updateSystemStorage(payload);
    successText.value = "系统配置已保存。";
    await loadSystem();
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
  saving.value = true;
  errorText.value = "";
  successText.value = "";
  try {
    await updateSystemStorage({
      sync: true,
      webdav: { scanRemote: scanRemote.value },
    });
    successText.value = "同步完成。";
    await loadSystem();
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "同步失败。";
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadSystem();
});
</script>

<template>
  <section class="admin-system-view">
    <h2>系统设置</h2>
    <div v-if="errorText" class="error-text">{{ errorText }}</div>
    <div v-if="successText" class="success-text">{{ successText }}</div>

    <div class="panel">
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

    <div class="panel">
      <h3>存储配置</h3>
      <form class="storage-form" @submit.prevent="saveStorage">
        <div class="form-grid">
          <label class="field">
            <span>模式</span>
            <select v-model="mode" class="field-input" @change="handleModeChange">
              <option value="local">local</option>
              <option value="hybrid">hybrid</option>
              <option value="webdav">webdav</option>
            </select>
          </label>

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
        </div>

        <div class="checkbox-row">
          <label class="checkbox">
            <input v-model="scanRemote" type="checkbox" />
            <span>同步时扫描远端目录</span>
          </label>
          <label class="checkbox">
            <input v-model="syncOnSave" type="checkbox" />
            <span>保存后立即同步</span>
          </label>
        </div>

        <div class="actions">
          <button type="button" class="btn btn-ghost" :disabled="saving || !canSyncNow" @click="syncNow">立即同步</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">保存配置</button>
        </div>
      </form>
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

.status-grid {
  display: grid;
  gap: 6px;
}

.status-grid > div {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.status-grid span {
  color: var(--muted);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.storage-form {
  display: grid;
  gap: 10px;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}

.field-input {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  padding: 8px 10px;
}

.checkbox-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--surface);
  color: inherit;
  font-size: 13px;
  cursor: pointer;
}

.btn-ghost {
  background: color-mix(in srgb, var(--surface) 88%, var(--bg));
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
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
</style>
