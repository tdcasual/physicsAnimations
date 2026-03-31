<script setup lang="ts">
  type WizardStep = 1 | 2 | 3 | 4
  const props = defineProps<{
    mode: string
    wizardBusy: boolean
    readOnlyMode: boolean
  }>()
  const emit = defineEmits<{
    (event: 'update:mode', value: string): void
    (event: 'mode-changed'): void
    (event: 'next'): void
  }>()
</script>

<template>
  <div class="wizard-panel">
    <h4>选择模式</h4>
    <div class="mode-grid">
      <label class="mode-card" :class="{ active: mode === 'local' }">
        <input
          :value="mode"
          type="radio"
          value="local"
          :disabled="wizardBusy || readOnlyMode"
          @change="emit('update:mode', 'local'); emit('mode-changed')"
        />
        <strong>local</strong>
        <span>仅使用本地目录存储，配置简单，离线可用。</span>
      </label>
      <label class="mode-card" :class="{ active: mode === 'webdav' }">
        <input
          :value="mode"
          type="radio"
          value="webdav"
          :disabled="wizardBusy || readOnlyMode"
          @change="emit('update:mode', 'webdav'); emit('mode-changed')"
        />
        <strong>webdav</strong>
        <span>直接使用 WebDAV 作为主存储，适合集中化部署场景。</span>
      </label>
    </div>
    <div class="actions admin-actions">
      <button type="button" class="btn btn-primary" :disabled="wizardBusy" @click="emit('next')">下一步</button>
    </div>
  </div>
</template>

<style scoped>
  .wizard-panel { border: 1px dashed var(--border); border-radius: 10px; padding: 10px; display: grid; gap: 10px; }
  h4 { margin: 0; font-size: var(--text-admin-base); }
  .mode-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
  .mode-card { border: 1px solid var(--border); border-radius: 12px; padding: 10px; display: grid; gap: 6px; cursor: pointer; background: color-mix(in srgb, var(--surface) 94%, var(--bg)); }
  .mode-card input { margin: 0; }
  .mode-card.active { border-color: color-mix(in srgb, var(--primary) 70%, var(--border)); background: color-mix(in srgb, var(--primary) 10%, var(--surface)); }
  .mode-card span { color: var(--muted); font-size: var(--text-admin-sm); }
  .actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
  .btn:disabled { cursor: not-allowed; opacity: 0.6; }
  @media (max-width: 640px) {
    .mode-grid { grid-template-columns: 1fr; }
    .wizard-panel { padding: 12px; }
    .actions { justify-content: stretch; }
    .actions .btn { flex: 1 1 calc(50% - 6px); }
  }
</style>
