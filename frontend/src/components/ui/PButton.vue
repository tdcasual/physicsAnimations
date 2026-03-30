<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md'
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    :class="[
      'p-button',
      `p-button--${variant}`,
      `p-button--${size}`,
      { 'p-button--loading': loading }
    ]"
    :disabled="disabled || loading"
    @click="emit('click', $event)"
  >
    <span v-if="loading" class="p-button__spinner" />
    <span class="p-button__content" :class="{ 'p-button__content--hidden': loading }">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.p-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: inherit;
  font-weight: var(--font-medium);
  border: none;
  cursor: pointer;
  transition: 
    background-color var(--duration-normal) var(--ease-smooth),
    box-shadow var(--duration-normal) var(--ease-smooth),
    transform var(--duration-fast) var(--ease-smooth);
  white-space: nowrap;
  user-select: none;
}

/* 尺寸 */
.p-button--sm {
  height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
  border-radius: var(--radius-sm);
}
.p-button--md {
  height: 40px;
  padding: 0 var(--space-4);
  font-size: var(--text-base);
  border-radius: var(--radius-sm);
}
.p-button--lg {
  height: 48px;
  padding: 0 var(--space-5);
  font-size: var(--text-md);
  border-radius: var(--radius-md);
}

/* 主要按钮 */
.p-button--primary {
  background: var(--primary-default);
  color: var(--text-white);
  box-shadow: var(--shadow-sm);
}
.p-button--primary:hover:not(:disabled) {
  background: var(--primary-hover);
  box-shadow: var(--shadow-primary);
  transform: translateY(-1px);
}
.p-button--primary:active:not(:disabled) {
  background: var(--primary-active);
  transform: translateY(0) scale(0.98);
  box-shadow: var(--shadow-xs);
}

/* 次要按钮 */
.p-button--secondary {
  background: var(--surface-elevated);
  color: var(--text-primary);
  box-shadow: inset 0 0 0 1px var(--border-default);
}
.p-button--secondary:hover:not(:disabled) {
  background: var(--surface-panel);
  box-shadow: inset 0 0 0 1px var(--border-strong);
}
.p-button--secondary:active:not(:disabled) {
  background: var(--surface-page);
  transform: scale(0.98);
}

/* 幽灵按钮 */
.p-button--ghost {
  background: transparent;
  color: var(--text-secondary);
}
.p-button--ghost:hover:not(:disabled) {
  background: var(--surface-panel);
  color: var(--text-primary);
}

/* 危险按钮 */
.p-button--danger {
  background: var(--danger-9);
  color: var(--text-white);
}
.p-button--danger:hover:not(:disabled) {
  filter: brightness(1.1);
}

/* 加载状态 */
.p-button--loading {
  cursor: wait;
}
.p-button__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  position: absolute;
}
.p-button__content--hidden {
  opacity: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 禁用状态 */
.p-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}
</style>
