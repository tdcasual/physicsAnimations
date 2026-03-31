<script setup lang="ts">
  type WizardStep = 1 | 2 | 3 | 4
  defineProps<{
    remoteMode: boolean
    mode: string
    url: string
    basePath: string
    username: string
    timeoutMs: number
    validateText: string
    validateOk: boolean
    hasUnsavedChanges: boolean
    saveDisabledHint: string
    continueDisabledHint: string
    wizardBusy: boolean
    readOnlyMode: boolean
    validating: boolean
    saving: boolean
  }>()
  const emit = defineEmits<{
    (event: 'go-step', value: WizardStep): void
    (event: 'run-validation'): void
    (event: 'save-storage'): void
  }>()
</script>

<template>
  <div class="wizard-panel">
    <h4>校验与保存</h4>
    <div class="summary-grid">
      <div><span>模式：</span>{{ mode }}</div>
      <div><span>URL：</span>{{ remoteMode ? url || '-' : '-' }}</div>
      <div><span>Base Path：</span>{{ remoteMode ? basePath || '-' : '-' }}</div>
      <div><span>用户：</span>{{ remoteMode ? username || '-' : '-' }}</div>
      <div><span>超时：</span>{{ remoteMode ? (Number.isFinite(timeoutMs) ? `${timeoutMs}ms` : '默认(15000ms)') : '-' }}</div>
    </div>
    <div v-if="validateText" class="validate-text" :class="{ ok: validateOk }">{{ validateText }}</div>
    <div v-if="hasUnsavedChanges" class="pending-text">存在未保存改动。</div>
    <div v-if="saveDisabledHint" class="save-disabled-hint admin-feedback">{{ saveDisabledHint }}</div>
    <div v-if="continueDisabledHint" class="continue-disabled-hint admin-feedback">{{ continueDisabledHint }}</div>
    <div class="actions admin-actions wizard-step3-actions">
      <button type="button" class="btn btn-ghost" :disabled="wizardBusy" @click="emit('go-step', 2)">上一步</button>
      <button v-if="remoteMode" type="button" class="btn btn-ghost" :disabled="wizardBusy || readOnlyMode" @click="emit('run-validation')">{{ validating ? '校验中...' : '测试连接' }}</button>
      <button type="button" class="btn btn-primary" :disabled="wizardBusy || readOnlyMode" @click="emit('save-storage')">{{ saving ? '保存中...' : '保存配置' }}</button>
      <button type="button" class="btn btn-ghost" :disabled="wizardBusy || hasUnsavedChanges" @click="emit('go-step', 4)">下一步</button>
    </div>
  </div>
</template>

<style scoped>
  .wizard-panel { border: 1px dashed var(--border); border-radius: 10px; padding: 10px; display: grid; gap: 10px; }
  h4 { margin: 0; font-size: var(--text-admin-base); }
  .summary-grid { display: grid; gap: 6px; }
  .summary-grid span { color: var(--muted); }
  .actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
  .btn:disabled { cursor: not-allowed; opacity: 0.6; }
  .validate-text, .pending-text, .save-disabled-hint, .continue-disabled-hint { font-size: var(--text-admin-sm); color: var(--muted); }
  .validate-text.ok { color: var(--success); }
  @media (max-width: 640px) {
    .wizard-panel { padding: 12px; }
    .actions { justify-content: stretch; }
    .actions .btn { flex: 1 1 calc(50% - 6px); }
    .wizard-step3-actions { display: grid; grid-template-columns: 1fr; }
    .wizard-step3-actions .btn { width: 100%; flex: 1 1 auto; }
  }
</style>
