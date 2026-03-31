<script setup lang="ts">
  type WizardStep = 1 | 2 | 3 | 4
  defineProps<{
    remoteMode: boolean
    syncHint: string
    canSyncNow: boolean
    syncing: boolean
    wizardBusy: boolean
  }>()
  const emit = defineEmits<{
    (event: 'go-step', value: WizardStep): void
    (event: 'sync-now'): void
  }>()
</script>

<template>
  <div class="wizard-panel">
    <h4>启用与同步</h4>
    <div v-if="remoteMode" class="sync-box">
      <div v-if="syncHint" class="sync-hint">{{ syncHint }}</div>
      <button type="button" class="btn btn-primary" :disabled="syncing || !canSyncNow" @click="emit('sync-now')">{{ syncing ? '同步中...' : '立即同步' }}</button>
    </div>
    <div v-else class="empty">local 模式已生效，无需远端同步。</div>
    <div class="actions admin-actions">
      <button type="button" class="btn btn-ghost" :disabled="wizardBusy" @click="emit('go-step', 3)">上一步</button>
      <button type="button" class="btn btn-ghost" :disabled="wizardBusy" @click="emit('go-step', 1)">重新配置</button>
    </div>
  </div>
</template>

<style scoped>
  .wizard-panel { border: 1px dashed var(--border); border-radius: 10px; padding: 10px; display: grid; gap: 10px; }
  h4 { margin: 0; font-size: var(--text-admin-base); }
  .sync-box { display: grid; gap: 8px; }
  .sync-hint { font-size: var(--text-admin-sm); color: var(--muted); }
  .empty { border: 1px dashed var(--border); border-radius: 8px; padding: 14px; color: var(--muted); }
  .actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
  .btn:disabled { cursor: not-allowed; opacity: 0.6; }
  @media (max-width: 640px) {
    .wizard-panel { padding: 12px; }
    .actions { justify-content: stretch; }
    .actions .btn { flex: 1 1 calc(50% - 6px); }
  }
</style>
