<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  remoteMode: boolean;
  url: string;
  basePath: string;
  username: string;
  password: string;
  timeoutMs: number;
  scanRemote: boolean;
  getFieldError: (key: string) => string;
  clearFieldErrors: (key?: string) => void;
}>();

const emit = defineEmits<{
  (event: "update:url", value: string): void;
  (event: "update:basePath", value: string): void;
  (event: "update:username", value: string): void;
  (event: "update:password", value: string): void;
  (event: "update:timeoutMs", value: number): void;
  (event: "update:scanRemote", value: boolean): void;
  (event: "go-prev"): void;
  (event: "go-next"): void;
}>();

const urlModel = computed({
  get: () => props.url,
  set: (value: string) => emit("update:url", value),
});
const basePathModel = computed({
  get: () => props.basePath,
  set: (value: string) => emit("update:basePath", value),
});
const usernameModel = computed({
  get: () => props.username,
  set: (value: string) => emit("update:username", value),
});
const passwordModel = computed({
  get: () => props.password,
  set: (value: string) => emit("update:password", value),
});
const timeoutMsModel = computed({
  get: () => props.timeoutMs,
  set: (value: number | string) => emit("update:timeoutMs", Number(value || 0)),
});
const scanRemoteModel = computed({
  get: () => props.scanRemote,
  set: (value: boolean) => emit("update:scanRemote", value),
});
</script>

<template>
  <div class="wizard-panel">
    <h4>连接配置</h4>

    <div v-if="remoteMode" class="form-grid">
      <label class="field" :class="{ 'has-error': getFieldError('webdavUrl') }">
        <span>WebDAV URL</span>
        <input
          v-model="urlModel"
          class="field-input"
          type="url"
          name="webdav_url"
          autocomplete="url"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          placeholder="https://example.com/dav/"
          @input="clearFieldErrors('webdavUrl')"
        />
        <div v-if="getFieldError('webdavUrl')" class="field-error-text">{{ getFieldError("webdavUrl") }}</div>
      </label>

      <label class="field">
        <span>WebDAV Base Path</span>
        <input
          v-model="basePathModel"
          class="field-input"
          type="text"
          name="webdav_base_path"
          autocomplete="off"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
        />
      </label>

      <label class="field">
        <span>WebDAV 用户名</span>
        <input
          v-model="usernameModel"
          class="field-input"
          type="text"
          name="webdav_username"
          autocomplete="username"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
        />
      </label>

      <label class="field">
        <span>WebDAV 密码（留空表示不更新）</span>
        <input
          v-model="passwordModel"
          class="field-input"
          type="password"
          name="webdav_password"
          autocomplete="current-password"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
        />
      </label>

      <label class="field">
        <span>超时（毫秒）</span>
        <input
          v-model.number="timeoutMsModel"
          class="field-input"
          type="number"
          name="webdav_timeout_ms"
          autocomplete="off"
          min="1000"
        />
      </label>

      <label class="checkbox">
        <input v-model="scanRemoteModel" type="checkbox" />
        <span>同步时扫描远端目录</span>
      </label>
    </div>

    <div v-else class="empty">local 模式无需 WebDAV 配置，下一步可直接保存。</div>

    <div class="actions admin-actions">
      <button type="button" class="btn btn-ghost" @click="emit('go-prev')">上一步</button>
      <button type="button" class="btn btn-primary" @click="emit('go-next')">下一步</button>
    </div>
  </div>
</template>

<style scoped>
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

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
