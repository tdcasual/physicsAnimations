<script setup lang="ts">
  /**
   * ActionBar
   *
   * 操作按钮栏组件
   * 提供一致的操作按钮布局
   *
   * @example
   * <ActionBar>
   *   <template #primary>
   *     <button @click="save">保存</button>
   *   </template>
   *   <template #secondary>
   *     <button @click="cancel">取消</button>
   *   </template>
   * </ActionBar>
   */
  interface Props {
    /** 对齐方式 */
    align?: 'start' | 'center' | 'end'
    /** 是否紧凑模式 */
    compact?: boolean
    /** 是否 sticky 定位 */
    sticky?: boolean
  }

  withDefaults(defineProps<Props>(), {
    align: 'end',
    compact: false,
    sticky: false,
  })
</script>

<template>
  <div
    :class="[
      'action-bar',
      `action-bar--${align}`,
      { 'action-bar--compact': compact, 'action-bar--sticky': sticky },
    ]"
  >
    <div v-if="$slots.start" class="action-bar-section action-bar-section--start">
      <slot name="start" />
    </div>

    <div v-if="$slots.secondary" class="action-bar-section action-bar-section--secondary">
      <slot name="secondary" />
    </div>

    <div v-if="$slots.default" class="action-bar-section action-bar-section--default">
      <slot />
    </div>

    <div v-if="$slots.primary" class="action-bar-section action-bar-section--primary">
      <slot name="primary" />
    </div>

    <div v-if="$slots.end" class="action-bar-section action-bar-section--end">
      <slot name="end" />
    </div>
  </div>
</template>

<style scoped>
  .action-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .action-bar--start {
    justify-content: flex-start;
  }

  .action-bar--center {
    justify-content: center;
  }

  .action-bar--end {
    justify-content: flex-end;
  }

  .action-bar--compact {
    gap: 4px;
  }

  .action-bar--compact .action-bar-section {
    gap: 4px;
  }

  .action-bar--sticky {
    position: sticky;
    bottom: 0;
    padding: 12px 0;
    background: linear-gradient(to top, var(--surface, #fff) 70%, transparent);
    z-index: 10;
  }

  .action-bar-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .action-bar-section--start {
    margin-right: auto;
  }

  .action-bar-section--end {
    margin-left: auto;
  }

  .action-bar-section--primary {
    order: 1;
  }

  .action-bar-section--secondary {
    order: 0;
  }

  /* 按钮基础样式 */
  .action-bar :deep(button) {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: calc(14px * var(--ui-scale, 1));
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      opacity 150ms ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .action-bar :deep(button:disabled) {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* 主要按钮样式 - 通过类名 */
  .action-bar :deep(.btn-primary) {
    border: 1px solid var(--primary, #3b82f6);
    background: var(--primary, #3b82f6);
    color: white;
  }

  .action-bar :deep(.btn-primary:hover:not(:disabled)) {
    background: color-mix(in srgb, var(--primary, #3b82f6) 90%, black);
    border-color: color-mix(in srgb, var(--primary, #3b82f6) 90%, black);
  }

  /* 次要按钮样式 */
  .action-bar :deep(.btn-secondary) {
    border: 1px solid var(--border, #e5e7eb);
    background: var(--surface, #fff);
    color: var(--text, #374151);
  }

  .action-bar :deep(.btn-secondary:hover:not(:disabled)) {
    background: color-mix(in srgb, var(--surface, #fff) 95%, var(--text, #374151));
  }

  /* 危险按钮样式 */
  .action-bar :deep(.btn-danger) {
    border: 1px solid var(--danger, #dc2626);
    background: var(--danger, #dc2626);
    color: white;
  }

  .action-bar :deep(.btn-danger:hover:not(:disabled)) {
    background: color-mix(in srgb, var(--danger, #dc2626) 90%, black);
    border-color: color-mix(in srgb, var(--danger, #dc2626) 90%, black);
  }

  /* 幽灵按钮样式 */
  .action-bar :deep(.btn-ghost) {
    border: 1px solid transparent;
    background: transparent;
    color: var(--text, #374151);
  }

  .action-bar :deep(.btn-ghost:hover:not(:disabled)) {
    background: color-mix(in srgb, var(--muted, #6b7280) 10%, transparent);
  }

  @media (max-width: 640px) {
    .action-bar {
      gap: 6px;
    }

    .action-bar-section {
      width: 100%;
    }

    .action-bar-section > * {
      flex: 1;
      min-width: 0;
    }

    .action-bar :deep(button) {
      padding: 10px 16px;
    }

    .action-bar-section--secondary,
    .action-bar-section--primary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    }
  }
</style>
