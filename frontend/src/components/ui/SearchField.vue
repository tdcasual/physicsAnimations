<script setup lang="ts">
  /**
   * SearchField
   *
   * 搜索输入框组件
   * 带清除按钮和搜索图标
   *
   * @example
   * <SearchField v-model="query" placeholder="搜索..." />
   */
  import { computed } from 'vue'

  interface Props {
    /** 输入值 */
    modelValue: string
    /** 占位符文本 */
    placeholder?: string
    /** 是否禁用 */
    disabled?: boolean
    /** 输入框 ID */
    inputId?: string
    /** 是否自动聚焦 */
    autofocus?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    placeholder: '搜索...',
    disabled: false,
    inputId: undefined,
    autofocus: false,
  })

  const emit = defineEmits<{
    /** 更新值 */
    (e: 'update:modelValue', value: string): void
    /** 清除 */
    (e: 'clear'): void
  }>()

  const value = computed({
    get: () => props.modelValue,
    set: val => emit('update:modelValue', val),
  })

  const showClear = computed(() => value.value.length > 0)

  function clear() {
    value.value = ''
    emit('clear')
  }
</script>

<template>
  <div class="search-field">
    <svg
      class="search-field-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>

    <input
      :id="inputId"
      v-model="value"
      type="search"
      class="search-field-input"
      :placeholder="placeholder"
      :disabled="disabled"
      :autofocus="autofocus"
    />

    <button
      v-if="showClear"
      type="button"
      class="search-field-clear"
      aria-label="清除搜索"
      @click="clear"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
  .search-field {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-field-input {
    width: 100%;
    padding: 10px 36px;
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 10px;
    background: var(--surface, #fff);
    color: var(--text, #374151);
    font-size: calc(14px * var(--ui-scale, 1));
    line-height: 1.5;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .search-field-input::placeholder {
    color: var(--muted, #9ca3af);
  }

  .search-field-input:hover {
    border-color: color-mix(in srgb, var(--primary, #3b82f6) 50%, var(--border, #e5e7eb));
  }

  .search-field-input:focus {
    outline: none;
    border-color: var(--primary, #3b82f6);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #3b82f6) 15%, transparent);
  }

  .search-field-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: color-mix(in srgb, var(--surface, #fff) 95%, var(--text, #374151));
  }

  .search-field-icon {
    position: absolute;
    left: 12px;
    color: var(--muted, #9ca3af);
    pointer-events: none;
  }

  .search-field-clear {
    position: absolute;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: color-mix(in srgb, var(--muted, #9ca3af) 15%, transparent);
    color: var(--muted, #9ca3af);
    cursor: pointer;
    transition:
      background-color 150ms ease,
      color 150ms ease;
  }

  .search-field-clear:hover {
    background: color-mix(in srgb, var(--danger, #dc2626) 15%, transparent);
    color: var(--danger, #dc2626);
  }

  /* 搜索框清除按钮样式 */
  .search-field-input::-webkit-search-cancel-button {
    display: none;
  }
</style>
