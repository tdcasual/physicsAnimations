<script setup lang="ts">
  import { ref, computed } from 'vue'

  interface Props {
    modelValue?: string
    placeholder?: string
    type?: string
    size?: 'sm' | 'md' | 'lg'
    error?: string
    disabled?: boolean
    id?: string
    ariaLabel?: string
    ariaDescribedby?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    type: 'text',
    size: 'md',
  })

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    blur: [event: FocusEvent]
    focus: [event: FocusEvent]
  }>()

  const isFocused = ref(false)
  const inputId = computed(() => props.id || `p-input-${Math.random().toString(36).slice(2, 9)}`)
  const errorId = computed(() => (props.error ? `${inputId.value}-error` : undefined))
  const describedBy = computed(() => {
    const ids: string[] = []
    if (props.error && errorId.value) ids.push(errorId.value)
    if (props.ariaDescribedby) ids.push(props.ariaDescribedby)
    return ids.length > 0 ? ids.join(' ') : undefined
  })

  function onInput(e: Event) {
    emit('update:modelValue', (e.target as HTMLInputElement).value)
  }
</script>

<template>
  <div class="p-input-wrapper">
    <div
      :class="[
        'p-input-container',
        `p-input-container--${size}`,
        {
          'p-input-container--focused': isFocused,
          'p-input-container--error': error,
          'p-input-container--disabled': disabled,
        },
      ]"
    >
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-label="ariaLabel"
        :aria-describedby="describedBy"
        :aria-invalid="!!error"
        class="p-input"
        @input="onInput"
        @focus="($event: FocusEvent) => { isFocused = true; emit('focus', $event) }"
        @blur="($event: FocusEvent) => { isFocused = false; emit('blur', $event) }"
      />
    </div>
    <span
      v-if="error"
      :id="errorId"
      class="p-input__error"
      role="alert"
    >{{ error }}</span>
  </div>
</template>

<style scoped>
  .p-input-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .p-input-container {
    display: flex;
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    transition:
      border-color var(--duration-fast) var(--ease-smooth),
      box-shadow var(--duration-fast) var(--ease-smooth);
  }

  .p-input-container--sm {
    height: 32px;
    padding: 0 var(--space-3);
    font-size: var(--text-sm);
  }
  .p-input-container--md {
    height: 40px;
    padding: 0 var(--space-3);
    font-size: var(--text-base);
  }
  .p-input-container--lg {
    height: 48px;
    padding: 0 var(--space-4);
    font-size: var(--text-md);
  }

  .p-input-container:hover:not(.p-input-container--disabled) {
    border-color: var(--border-strong);
  }

  .p-input-container--focused {
    border-color: var(--primary-default);
    box-shadow: 0 0 0 3px var(--primary-subtle);
  }

  .p-input-container--error {
    border-color: var(--danger-9);
  }
  .p-input-container--error.p-input-container--focused {
    box-shadow: 0 0 0 3px oklch(55% 0.18 25 / 0.15);
  }

  .p-input-container--disabled {
    background: var(--surface-panel);
    cursor: not-allowed;
  }

  .p-input {
    flex: 1;
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: inherit;
    color: var(--text-primary);
    outline: none;
  }

  .p-input::placeholder {
    color: var(--text-quaternary);
  }

  .p-input:disabled {
    cursor: not-allowed;
    color: var(--text-tertiary);
  }

  .p-input__error {
    font-size: var(--text-xs);
    color: var(--danger-9);
    margin-left: var(--space-1);
  }
</style>
