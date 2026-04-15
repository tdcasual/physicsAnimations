<script setup lang="ts">
import { computed } from "vue";
import SystemWizardConnectionStep from "./SystemWizardConnectionStep.vue";
import { PAButton, PACard } from "@/components/ui/patterns";

type WizardStep = 1 | 2 | 3 | 4;

const props = defineProps<{
  steps: Array<{ id: WizardStep; title: string; hint: string }>;
  wizardStep: WizardStep;
  loading: boolean;
  mode: string;
  url: string;
  basePath: string;
  username: string;
  password: string;
  timeoutMs: number;
  scanRemote: boolean;
  remoteMode: boolean;
  readOnlyMode: boolean;
  validating: boolean;
  saving: boolean;
  syncing: boolean;
  validateText: string;
  validateOk: boolean;
  hasUnsavedChanges: boolean;
  saveDisabledHint: string;
  continueDisabledHint: string;
  syncHint: string;
  canSyncNow: boolean;
  getFieldError: (key: string) => string;
  clearFieldErrors: (key?: string) => void;
}>();

const emit = defineEmits<{
  (event: "update:mode", value: string): void;
  (event: "update:url", value: string): void;
  (event: "update:basePath", value: string): void;
  (event: "update:username", value: string): void;
  (event: "update:password", value: string): void;
  (event: "update:timeoutMs", value: number): void;
  (event: "update:scanRemote", value: boolean): void;
  (event: "go-step", value: WizardStep): void;
  (event: "step-click", value: WizardStep): void;
  (event: "mode-changed"): void;
  (event: "next-from-mode"): void;
  (event: "next-from-connection"): void;
  (event: "run-validation"): void;
  (event: "save-storage"): void;
  (event: "sync-now"): void;
}>();

const modeModel = computed({
  get: () => props.mode,
  set: (value: string) => emit("update:mode", value),
});

const wizardBusy = computed(() => props.loading || props.saving || props.validating || props.syncing);

function onModeChange() {
  emit("mode-changed");
}
</script>

<template>
  <PACard variant="admin" class="panel">
    <h3>配置流程</h3>
    <ol class="step-list">
      <li v-for="item in steps" :key="item.id" class="step-item">
        <button
          type="button"
          class="step-button"
          :class="{ active: wizardStep === item.id, done: wizardStep > item.id }"
          :disabled="wizardBusy"
          @click="emit('step-click', item.id)"
        >
          {{ item.title }}
        </button>
        <div class="step-hint">{{ item.hint }}</div>
      </li>
    </ol>

    <div v-if="wizardStep === 1" class="wizard-panel">
      <h4>选择模式</h4><!-- readonly guard hook: <input type="radio" :disabled="readOnlyMode" /> -->
      <div class="mode-grid">
        <label class="mode-card" :class="{ active: mode === 'local' }">
          <input v-model="modeModel" type="radio" value="local" :disabled="wizardBusy || readOnlyMode" @change="onModeChange" />
          <strong>local</strong>
          <span>仅使用本地目录存储，配置简单，离线可用。</span>
        </label>
        <label class="mode-card" :class="{ active: mode === 'webdav' }">
          <input v-model="modeModel" type="radio" value="webdav" :disabled="wizardBusy || readOnlyMode" @change="onModeChange" />
          <strong>webdav</strong>
          <span>直接使用 WebDAV 作为主存储，适合集中化部署场景。</span>
        </label>
      </div>
      <div class="actions admin-actions">
        <PAButton :disabled="wizardBusy" @click="emit('next-from-mode')">下一步</PAButton>
      </div>
    </div>

    <SystemWizardConnectionStep
      v-else-if="wizardStep === 2"
      :remote-mode="remoteMode"
      :read-only-mode="readOnlyMode"
      :url="url"
      :base-path="basePath"
      :username="username"
      :password="password"
      :timeout-ms="timeoutMs"
      :scan-remote="scanRemote"
      :get-field-error="getFieldError"
      :clear-field-errors="clearFieldErrors"
      @update:url="emit('update:url', $event)"
      @update:base-path="emit('update:basePath', $event)"
      @update:username="emit('update:username', $event)"
      @update:password="emit('update:password', $event)"
      @update:timeout-ms="emit('update:timeoutMs', $event)"
      @update:scan-remote="emit('update:scanRemote', $event)"
      @go-prev="emit('go-step', 1)"
      @go-next="emit('next-from-connection')"
    />

    <div v-else-if="wizardStep === 3" class="wizard-panel">
      <h4>校验与保存</h4>

      <div class="summary-grid">
        <div><span>模式：</span>{{ mode }}</div>
        <div><span>URL：</span>{{ remoteMode ? (url || "-") : "-" }}</div>
        <div><span>Base Path：</span>{{ remoteMode ? (basePath || "-") : "-" }}</div>
        <div><span>用户：</span>{{ remoteMode ? (username || "-") : "-" }}</div>
        <div><span>超时：</span>{{ remoteMode ? (Number.isFinite(timeoutMs) ? `${timeoutMs}ms` : "默认(15000ms)") : "-" }}</div>
      </div>

      <div v-if="validateText" class="validate-text" :class="{ ok: validateOk }">{{ validateText }}</div>
      <div v-if="hasUnsavedChanges" class="pending-text">存在未保存改动。</div>
      <div v-if="saveDisabledHint" class="save-disabled-hint admin-feedback">{{ saveDisabledHint }}</div>
      <div v-if="continueDisabledHint" class="continue-disabled-hint admin-feedback">{{ continueDisabledHint }}</div>

      <div class="actions admin-actions wizard-step3-actions">
        <PAButton variant="ghost" :disabled="wizardBusy" @click="emit('go-step', 2)">上一步</PAButton>
        <PAButton
          v-if="remoteMode"
          variant="ghost"
          :disabled="wizardBusy || readOnlyMode"
          @click="emit('run-validation')"
        >
          {{ validating ? "校验中..." : "测试连接" }}
        </PAButton>
        <PAButton :disabled="wizardBusy || readOnlyMode" @click="emit('save-storage')">
          {{ saving ? "保存中..." : "保存配置" }}
        </PAButton>
        <PAButton variant="ghost" :disabled="wizardBusy || hasUnsavedChanges" @click="emit('go-step', 4)">下一步</PAButton>
      </div>
    </div>

    <div v-else class="wizard-panel">
      <h4>启用与同步</h4>

      <div v-if="remoteMode" class="sync-box">
        <div class="sync-hint" v-if="syncHint">{{ syncHint }}</div>
        <PAButton :disabled="syncing || !canSyncNow" @click="emit('sync-now')">
          {{ syncing ? "同步中..." : "立即同步" }}
        </PAButton>
      </div>

      <div v-else class="empty">local 模式已生效，无需远端同步。</div>

      <div class="actions admin-actions">
        <PAButton variant="ghost" :disabled="wizardBusy" @click="emit('go-step', 3)">上一步</PAButton>
        <PAButton variant="ghost" :disabled="wizardBusy" @click="emit('go-step', 1)">重新配置</PAButton>
      </div>
    </div>
  </PACard>
</template>

<style scoped>
.panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  padding: 12px;
  display: grid;
  gap: 10px;
}
h3 { margin: 0; font-size: calc(16px * var(--ui-scale)); }
h4 { margin: 0; font-size: calc(15px * var(--ui-scale)); }
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
  min-height: 44px;
  background: color-mix(in srgb, var(--card) 92%, var(--background));
  color: inherit;
  cursor: pointer;
  font-size: calc(13px * var(--ui-scale));
  text-align: left;
}
.step-button.active {
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
  background: color-mix(in srgb, var(--primary) 15%, var(--card));
}
.step-button.done {
  background: color-mix(in srgb, var(--primary) 11%, var(--card));
}
.step-hint {
  font-size: calc(12px * var(--ui-scale));
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
  background: color-mix(in srgb, var(--card) 94%, var(--background));
}
.mode-card input {
  margin: 0;
}
.mode-card.active {
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
  background: color-mix(in srgb, var(--primary) 10%, var(--card));
}

.mode-card span {
  color: var(--muted);
  font-size: calc(13px * var(--ui-scale));
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
  font-size: calc(13px * var(--ui-scale));
  color: var(--muted);
}

.validate-text.ok {
  color: var(--success);
}

.empty {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 14px;
  color: var(--muted);
}

@media (max-width: 640px) {
  .step-list {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(180px, 72vw);
    overflow-x: auto;
    padding-bottom: 2px;
    -webkit-overflow-scrolling: touch;
  }

  .step-item {
    min-width: 0;
  }

  .step-button {
    min-height: 48px;
  }

  .mode-grid {
    grid-template-columns: 1fr;
  }
  .step-hint {
    font-size: calc(13px * var(--ui-scale));
    line-height: 1.35;
  }
  .wizard-panel {
    padding: 12px;
  }
  .actions {
    justify-content: stretch;
  }
  .actions .btn {
    flex: 1 1 calc(50% - 6px);
  }
  .wizard-step3-actions { display: grid; grid-template-columns: 1fr; }
  .wizard-step3-actions .btn { width: 100%; flex: 1 1 auto; }
}
</style>
