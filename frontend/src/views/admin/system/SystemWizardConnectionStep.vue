<script setup lang="ts">
import { computed } from "vue";
import { parseTimeoutMs } from "../../../features/admin/systemFormState";
import { PAButton, PAField, PAInput, PAActions } from "@/components/ui/patterns";

const props = defineProps<{
  remoteMode: boolean;
  readOnlyMode: boolean;
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

function parseTimeoutMsInput(value: number | string): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : Number.NaN;
  }
  const raw = String(value || "").trim();
  if (!raw) return Number.NaN;
  const parsed = parseTimeoutMs(raw);
  return parsed === undefined ? Number.NaN : parsed;
}

const timeoutMsModel = computed<number | string>({
  get: () => (Number.isFinite(props.timeoutMs) ? props.timeoutMs : ""),
  set: (value: number | string) => emit("update:timeoutMs", parseTimeoutMsInput(value)),
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
      <PAField label="WebDAV URL" :error="getFieldError('webdavUrl')">
        <PAInput v-model="urlModel" type="url" :disabled="readOnlyMode"
          name="webdav_url"
          autocomplete="url"
          placeholder="https://example.com/dav/"
          @input="clearFieldErrors('webdavUrl')"
        />
      </PAField>

      <PAField label="WebDAV Base Path">
        <PAInput
          v-model="basePathModel"
          type="text"
          :disabled="readOnlyMode"
          name="webdav_base_path"
          autocomplete="off"
        />
      </PAField>

      <PAField label="WebDAV 用户名">
        <PAInput
          v-model="usernameModel"
          type="text"
          :disabled="readOnlyMode"
          name="webdav_username"
          autocomplete="username"
        />
      </PAField>

      <PAField label="WebDAV 密码（留空表示不更新）">
        <PAInput
          v-model="passwordModel"
          type="password"
          :disabled="readOnlyMode"
          name="webdav_password"
          autocomplete="current-password"
        />
      </PAField>

      <PAField label="超时（毫秒）">
        <PAInput
          v-model="timeoutMsModel"
          type="number"
          :disabled="readOnlyMode"
          name="webdav_timeout_ms"
          autocomplete="off"
        />
      </PAField>

      <label class="checkbox">
        <input v-model="scanRemoteModel" type="checkbox" :disabled="readOnlyMode" />
        <span>同步时扫描远端目录</span>
      </label>
    </div>

    <div v-else class="empty">local 模式，无需配置。</div>

    <PAActions align="end">
      <PAButton variant="ghost" @click="emit('go-prev')">上一步</PAButton>
      <PAButton :disabled="readOnlyMode" @click="emit('go-next')">下一步</PAButton>
    </PAActions>
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
  font-size: calc(13px * var(--ui-scale));
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
