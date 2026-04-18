<script setup lang="ts">
import { computed } from "vue";

import type { SystemEmbedUpdater } from "../../../features/admin/system/useSystemWizard";

import { PAActions, PAButton, PACard, PAField, PAInput } from "@/components/ui/patterns";

const props = defineProps<{
  embedUpdater: SystemEmbedUpdater | null;
  loading: boolean;
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

const nextRunAtFormatted = computed(() => props.formatDate(props.embedUpdater?.nextRunAt || ""));
const lastCheckedAtFormatted = computed(() => props.formatDate(props.embedUpdater?.lastCheckedAt || ""));
const lastRunAtFormatted = computed(() => props.formatDate(props.embedUpdater?.lastRunAt || ""));
const lastSuccessAtFormatted = computed(() => props.formatDate(props.embedUpdater?.lastSuccessAt || ""));

function onEnabledChange(event: Event) {
  const input = event.target as HTMLInputElement | null;
  emit("update:enabled", input?.checked === true);
}

function onIntervalInput(value: string) {
  const parsed = Number(value || "");
  emit("update:intervalDays", Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN);
}
</script>

<template>
  <PACard variant="admin" as="section" class="panel system-embed-updater-panel">
    <div class="panel-heading">
      <div>
        <h3>Embed 自动更新</h3>
        <p class="panel-hint">默认 20 天自动执行</p>
      </div>
      <span class="status-chip" :data-status="statusLabel">{{ statusLabel }}</span>
    </div>

    <div class="settings-grid">
      <PAField class="toggle-field">
        <template #label>启用自动更新</template>
        <label class="inline-flex items-center gap-3 cursor-pointer">
          <input type="checkbox" :checked="enabled" :disabled="loading || saving" @change="onEnabledChange" />
          <span>{{ enabled ? "已启用" : "已暂停" }}</span>
        </label>
      </PAField>

      <PAField>
        <template #label>更新周期（天）</template>
        <PAInput
          type="number"
          min="1"
          max="365"
          step="1"
          inputmode="numeric"
          :model-value="Number.isFinite(intervalDays) ? intervalDays : ''"
          :disabled="loading || saving"
          @update:model-value="onIntervalInput"
        />
      </PAField>
    </div>

    <div class="status-grid">
      <div class="status-item">
        <span>下次计划</span>
        <strong class="break-anywhere">{{ nextRunAtFormatted }}</strong>
      </div>
      <div class="status-item">
        <span>上次检查</span>
        <strong class="break-anywhere">{{ lastCheckedAtFormatted }}</strong>
      </div>
      <div class="status-item">
        <span>上次执行</span>
        <strong class="break-anywhere">{{ lastRunAtFormatted }}</strong>
      </div>
      <div class="status-item">
        <span>上次成功</span>
        <strong class="break-anywhere">{{ lastSuccessAtFormatted }}</strong>
      </div>
      <div class="status-item">
        <span>GeoGebra</span>
        <strong class="break-anywhere">{{ embedUpdater?.lastSummary?.ggbStatus || '-' }}</strong>
      </div>
      <div class="status-item">
        <span>同步结果</span>
        <strong class="break-anywhere">
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

    <PAActions align="end">
      <PAButton :disabled="loading || saving || Boolean(saveHint)" @click="emit('save')">
        保存自动更新设置
      </PAButton>
    </PAActions>
  </PACard>
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
  color: var(--foreground);
  font-size: calc(13px * var(--ui-scale));
}

.status-chip {
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--info-bg);
  color: var(--foreground);
  font-size: calc(12px * var(--ui-scale));
  line-height: 1.2;
  white-space: nowrap;
}

.status-chip[data-status="ok"] {
  background: var(--success-bg);
  color: var(--success);
}

.status-chip[data-status="partial_failure"],
.status-chip[data-status="failed"] {
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  color: var(--destructive);
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
  color: var(--foreground);
}

.field-label {
  font-size: calc(13px * var(--ui-scale));
  color: var(--foreground);
}

.status-item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in oklab, var(--foreground) 4%, transparent);
}

.status-item span {
  font-size: calc(12px * var(--ui-scale));
  color: var(--foreground);
}

.status-item strong {
  word-break: break-word;
}

.error-text {
  color: var(--destructive);
}

.success-text {
  color: var(--success);
}

.pending-text,
.save-hint {
  color: var(--foreground);
}

@media (max-width: 640px) {
  .panel-heading {
    flex-direction: column;
  }
}
</style>
