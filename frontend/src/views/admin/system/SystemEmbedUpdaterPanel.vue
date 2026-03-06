<script setup lang="ts">
import { computed } from "vue";
import type { SystemEmbedUpdater } from "../../../features/admin/system/useSystemWizard";

const props = defineProps<{
  embedUpdater: SystemEmbedUpdater | null;
  enabled: boolean;
  intervalDays: number;
  saving: boolean;
  errorText: string;
  successText: string;
  hasUnsavedChanges: boolean;
  saveHint: string;
  formatDate: (raw: string) => string;
}>();

const emit = defineEmits<{
  (event: "update:enabled", value: boolean): void;
  (event: "update:intervalDays", value: number): void;
  (event: "save"): void;
}>();

const statusLabel = computed(() => props.embedUpdater?.lastSummary?.status || "idle");

function onEnabledChange(event: Event) {
  const input = event.target as HTMLInputElement | null;
  emit("update:enabled", input?.checked === true);
}

function onIntervalInput(event: Event) {
  const input = event.target as HTMLInputElement | null;
  const parsed = Number(input?.value || "");
  emit("update:intervalDays", Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN);
}
</script>

<template>
  <section class="panel admin-card system-embed-updater-panel">
    <div class="panel-heading">
      <div>
        <h3>Embed 自动更新</h3>
        <p class="panel-hint">统一管理 GeoGebra 资源包和远程 Embed 平台镜像，默认 20 天执行一次。</p>
      </div>
      <span class="status-chip" :data-status="statusLabel">{{ statusLabel }}</span>
    </div>

    <div class="settings-grid">
      <label class="admin-field toggle-field">
        <span class="field-label">启用自动更新</span>
        <span class="toggle-control">
          <input type="checkbox" :checked="enabled" @change="onEnabledChange" />
          <span>{{ enabled ? "已启用" : "已暂停" }}</span>
        </span>
      </label>

      <label class="admin-field">
        <span class="field-label">更新周期（天）</span>
        <input
          class="admin-input"
          type="number"
          min="1"
          max="365"
          step="1"
          inputmode="numeric"
          :value="Number.isFinite(intervalDays) ? intervalDays : ''"
          @input="onIntervalInput"
        />
      </label>
    </div>

    <div class="status-grid">
      <div class="status-item">
        <span>下次计划</span>
        <strong>{{ formatDate(embedUpdater?.nextRunAt || '') }}</strong>
      </div>
      <div class="status-item">
        <span>上次检查</span>
        <strong>{{ formatDate(embedUpdater?.lastCheckedAt || '') }}</strong>
      </div>
      <div class="status-item">
        <span>上次执行</span>
        <strong>{{ formatDate(embedUpdater?.lastRunAt || '') }}</strong>
      </div>
      <div class="status-item">
        <span>上次成功</span>
        <strong>{{ formatDate(embedUpdater?.lastSuccessAt || '') }}</strong>
      </div>
      <div class="status-item">
        <span>GeoGebra</span>
        <strong>{{ embedUpdater?.lastSummary?.ggbStatus || '-' }}</strong>
      </div>
      <div class="status-item">
        <span>同步结果</span>
        <strong>
          {{ embedUpdater?.lastSummary?.syncedProfiles ?? 0 }}/{{ embedUpdater?.lastSummary?.totalProfiles ?? 0 }}
          成功
        </strong>
      </div>
    </div>

    <div v-if="embedUpdater?.lastError" class="admin-feedback error-text">最近错误：{{ embedUpdater.lastError }}</div>
    <div v-if="errorText" class="admin-feedback error-text">{{ errorText }}</div>
    <div v-if="successText" class="admin-feedback success-text">{{ successText }}</div>
    <div v-if="hasUnsavedChanges" class="admin-feedback pending-text">存在未保存的自动更新配置。</div>
    <div v-if="saveHint" class="admin-feedback save-hint">{{ saveHint }}</div>

    <div class="admin-actions">
      <button type="button" class="btn btn-primary" :disabled="saving || Boolean(saveHint)" @click="emit('save')">
        保存自动更新设置
      </button>
    </div>
  </section>
</template>

<style scoped>
.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-hint {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.status-chip {
  border-radius: 999px;
  padding: 4px 10px;
  background: rgba(99, 102, 241, 0.12);
  color: #4338ca;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

.status-chip[data-status="ok"] {
  background: rgba(22, 163, 74, 0.12);
  color: #166534;
}

.status-chip[data-status="partial_failure"],
.status-chip[data-status="failed"] {
  background: rgba(220, 38, 38, 0.12);
  color: #991b1b;
}

.settings-grid,
.status-grid {
  display: grid;
  gap: 12px;
}

.settings-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.status-grid {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.toggle-field {
  justify-content: center;
}

.toggle-control {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
}

.field-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.status-item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.04);
}

.status-item span {
  font-size: 12px;
  color: var(--text-muted);
}

.status-item strong {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.error-text {
  color: var(--danger);
}

.success-text {
  color: #15803d;
}

.pending-text,
.save-hint {
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .panel-heading {
    flex-direction: column;
  }
}
</style>
