<script setup lang="ts">
  import { computed } from 'vue'
  import SystemWizardConnectionStep from './SystemWizardConnectionStep.vue'
  import SystemWizardModeStep from './SystemWizardModeStep.vue'
  import SystemWizardValidateStep from './SystemWizardValidateStep.vue'
  import SystemWizardSyncStep from './SystemWizardSyncStep.vue'

  type WizardStep = 1 | 2 | 3 | 4

  const props = defineProps<{
    steps: Array<{ id: WizardStep; title: string; hint: string }>
    wizardStep: WizardStep
    loading: boolean
    mode: string
    url: string
    basePath: string
    username: string
    password: string
    timeoutMs: number
    scanRemote: boolean
    remoteMode: boolean
    readOnlyMode: boolean
    validating: boolean
    saving: boolean
    syncing: boolean
    validateText: string
    validateOk: boolean
    hasUnsavedChanges: boolean
    saveDisabledHint: string
    continueDisabledHint: string
    syncHint: string
    canSyncNow: boolean
    getFieldError: (key: string) => string
    clearFieldErrors: (key?: string) => void
  }>()

  const emit = defineEmits<{
    (event: 'update:mode', value: string): void
    (event: 'update:url', value: string): void
    (event: 'update:basePath', value: string): void
    (event: 'update:username', value: string): void
    (event: 'update:password', value: string): void
    (event: 'update:timeoutMs', value: number): void
    (event: 'update:scanRemote', value: boolean): void
    (event: 'go-step', value: WizardStep): void
    (event: 'step-click', value: WizardStep): void
    (event: 'mode-changed'): void
    (event: 'next-from-mode'): void
    (event: 'next-from-connection'): void
    (event: 'run-validation'): void
    (event: 'save-storage'): void
    (event: 'sync-now'): void
  }>()

  const wizardBusy = computed(() => props.loading || props.saving || props.validating || props.syncing)
</script>

<template>
  <div class="panel admin-card">
    <h3>配置流程</h3>
    <ol class="step-list">
      <li v-for="item in steps" :key="item.id" class="step-item">
        <button type="button" class="step-button" :class="{ active: wizardStep === item.id, done: wizardStep > item.id }" :disabled="wizardBusy" @click="emit('step-click', item.id)">{{ item.title }}</button>
        <div class="step-hint">{{ item.hint }}</div>
      </li>
    </ol>

    <SystemWizardModeStep
      v-if="wizardStep === 1"
      :mode="mode"
      :wizard-busy="wizardBusy"
      :read-only-mode="readOnlyMode"
      @update:mode="emit('update:mode', $event)"
      @mode-changed="emit('mode-changed')"
      @next="emit('next-from-mode')"
    />

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

    <SystemWizardValidateStep
      v-else-if="wizardStep === 3"
      :remote-mode="remoteMode"
      :mode="mode"
      :url="url"
      :base-path="basePath"
      :username="username"
      :timeout-ms="timeoutMs"
      :validate-text="validateText"
      :validate-ok="validateOk"
      :has-unsaved-changes="hasUnsavedChanges"
      :save-disabled-hint="saveDisabledHint"
      :continue-disabled-hint="continueDisabledHint"
      :wizard-busy="wizardBusy"
      :read-only-mode="readOnlyMode"
      :validating="validating"
      :saving="saving"
      @go-step="emit('go-step', $event)"
      @run-validation="emit('run-validation')"
      @save-storage="emit('save-storage')"
    />

    <SystemWizardSyncStep
      v-else
      :remote-mode="remoteMode"
      :sync-hint="syncHint"
      :can-sync-now="canSyncNow"
      :syncing="syncing"
      :wizard-busy="wizardBusy"
      @go-step="emit('go-step', $event)"
      @sync-now="emit('sync-now')"
    />
  </div>
</template>

<style scoped>
  .panel { border: 1px solid var(--border); border-radius: 12px; background: var(--surface); padding: 12px; display: grid; gap: 10px; }
  h3 { margin: 0; font-size: var(--text-admin-base); }
  .step-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
  .step-item { display: grid; gap: 4px; }
  .step-button { border: 1px solid var(--border); border-radius: 999px; padding: 7px 10px; min-height: 44px; background: color-mix(in srgb, var(--surface) 92%, var(--bg)); color: inherit; cursor: pointer; font-size: var(--text-admin-sm); text-align: left; }
  .step-button.active { border-color: color-mix(in srgb, var(--primary) 70%, var(--border)); background: color-mix(in srgb, var(--primary) 15%, var(--surface)); }
  .step-button.done { background: color-mix(in srgb, var(--primary) 11%, var(--surface)); }
  .step-hint { font-size: var(--text-admin-xs); color: var(--muted); }
  @media (max-width: 640px) {
    .step-list { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(180px, 72vw); overflow-x: auto; padding-bottom: 2px; -webkit-overflow-scrolling: touch; }
    .step-item { min-width: 0; }
    .step-button { min-height: 48px; }
    .step-hint { font-size: var(--text-admin-sm); line-height: 1.35; }
  }
</style>
