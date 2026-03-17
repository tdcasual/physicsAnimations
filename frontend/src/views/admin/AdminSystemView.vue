<script setup lang="ts">
import { useSystemWizard } from "../../features/admin/system/useSystemWizard";
import SystemStatusPanel from "./system/SystemStatusPanel.vue";
import SystemWizardSteps from "./system/SystemWizardSteps.vue";
import SystemEmbedUpdaterPanel from "./system/SystemEmbedUpdaterPanel.vue";

const system = useSystemWizard();

const {
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
  readOnlyMode,
  canSyncNow,
  syncHint,
  hasStorageUnsavedChanges,
  hasEmbedUpdaterUnsavedChanges,
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
} = system;
</script>

<template>
  <section class="admin-system-view">
    <header class="admin-page-header admin-page-header--system">
      <div class="admin-page-copy">
        <p class="admin-page-kicker">同步与巡检</p>
        <h2>系统设置向导</h2>
      </div>
      <div class="admin-page-meta">
        <span class="admin-page-meta-label">当前节奏</span>
        <strong>{{ canSyncNow ? "可执行同步" : "待校验" }}</strong>
      </div>
    </header>

    <div v-if="errorText" class="error-text admin-feedback error">{{ errorText }}</div>
    <div v-if="successText" class="success-text admin-feedback success">{{ successText }}</div>

    <div class="admin-workspace-grid">
      <SystemWizardSteps
        class="admin-card"
        :steps="steps"
        :wizard-step="wizardStep"
        :loading="loading"
        :mode="mode"
        :url="url"
        :base-path="basePath"
        :username="username"
        :password="password"
        :timeout-ms="timeoutMs"
        :scan-remote="scanRemote"
        :remote-mode="remoteMode"
        :read-only-mode="readOnlyMode"
        :validating="validating"
        :saving="saving"
        :syncing="syncing"
        :validate-text="validateText"
        :validate-ok="validateOk"
        :has-unsaved-changes="hasStorageUnsavedChanges"
        :save-disabled-hint="saveDisabledHint"
        :continue-disabled-hint="continueDisabledHint"
        :sync-hint="syncHint"
        :can-sync-now="canSyncNow"
        :get-field-error="getFieldError"
        :clear-field-errors="clearFieldErrors"
        @update:mode="mode = $event"
        @update:url="url = $event"
        @update:base-path="basePath = $event"
        @update:username="username = $event"
        @update:password="password = $event"
        @update:timeout-ms="timeoutMs = $event"
        @update:scan-remote="scanRemote = $event"
        @go-step="goStep($event)"
        @step-click="goStep($event)"
        @mode-changed="onModeChanged"
        @next-from-mode="nextFromMode"
        @next-from-connection="nextFromConnection"
        @run-validation="runValidation"
        @save-storage="saveStorage"
        @sync-now="syncNow"
      />

      <aside class="admin-page-stack">
        <SystemStatusPanel class="admin-card" :loading="loading" :storage="storage" :format-date="formatDate" />

        <SystemEmbedUpdaterPanel
          class="admin-card"
          :embed-updater="embedUpdater"
          :loading="loading"
          :enabled="embedUpdaterEnabled"
          :interval-days="embedUpdaterIntervalDays"
          :saving="savingEmbedUpdater"
          :error-text="embedUpdaterErrorText"
          :success-text="embedUpdaterSuccessText"
          :has-unsaved-changes="hasEmbedUpdaterUnsavedChanges"
          :save-hint="embedUpdaterSaveHint"
          :format-date="formatDate"
          @update:enabled="embedUpdaterEnabled = $event"
          @update:interval-days="embedUpdaterIntervalDays = $event"
          @save="saveEmbedUpdater"
        />
      </aside>
    </div>
  </section>
</template>

<style scoped>
.admin-system-view {
  display: grid;
  gap: 14px;
}

.error-text {
  color: var(--danger);
  font-size: calc(13px * var(--ui-scale));
}

.success-text {
  color: var(--success);
  font-size: calc(13px * var(--ui-scale));
}
</style>
