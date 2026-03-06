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
    <h2>系统设置向导</h2>

    <div v-if="errorText" class="error-text admin-feedback error">{{ errorText }}</div>
    <div v-if="successText" class="success-text admin-feedback success">{{ successText }}</div>

    <SystemStatusPanel class="admin-card" :loading="loading" :storage="storage" :format-date="formatDate" />

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
      @mode-changed="onModeChanged"
      @next-from-mode="nextFromMode"
      @next-from-connection="nextFromConnection"
      @run-validation="runValidation"
      @save-storage="saveStorage"
      @sync-now="syncNow"
    />

    <SystemEmbedUpdaterPanel
      class="admin-card"
      :embed-updater="embedUpdater"
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

.error-text {
  color: var(--danger);
  font-size: 13px;
}

.success-text {
  color: #15803d;
  font-size: 13px;
}
</style>
