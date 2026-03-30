<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
  maskClosable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
  maskClosable: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onMaskClick() {
  if (props.maskClosable) close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="p-modal">
      <div v-show="modelValue" class="p-modal">
        <div class="p-modal__mask" @click="onMaskClick" />
        <div class="p-modal__wrapper">
          <div class="p-modal__content" :class="`p-modal__content--${size}`">
            <div v-if="title || closable" class="p-modal__header">
              <h3 v-if="title" class="p-modal__title">{{ title }}</h3>
              <button v-if="closable" type="button" class="p-modal__close" @click="close">
                ×
              </button>
            </div>
            <div class="p-modal__body">
              <slot />
            </div>
            <div v-if="$slots.footer" class="p-modal__footer">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.p-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
}

.p-modal__mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: oklch(0% 0 0 / 0.5);
  backdrop-filter: blur(4px);
}

.p-modal__wrapper {
  position: relative;
  z-index: 1;
  max-height: 90vh;
  overflow: auto;
  padding: var(--space-4);
}

.p-modal__content {
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}

.p-modal__content--sm { width: 400px; }
.p-modal__content--md { width: 520px; }
.p-modal__content--lg { width: 720px; }
.p-modal__content--xl { width: 920px; }

.p-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6) var(--space-3);
}

.p-modal__title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0;
}

.p-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 24px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--duration-fast) var(--ease-smooth);
}

.p-modal__close:hover {
  background: var(--surface-panel);
  color: var(--text-primary);
}

.p-modal__body {
  padding: var(--space-3) var(--space-6);
  color: var(--text-secondary);
}

.p-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6) var(--space-5);
  background: var(--surface-page);
}

.p-modal-enter-active,
.p-modal-leave-active {
  transition: opacity var(--duration-normal) var(--ease-smooth);
}

.p-modal-enter-active .p-modal__content,
.p-modal-leave-active .p-modal__content {
  transition: 
    transform var(--duration-normal) var(--ease-out-expo),
    opacity var(--duration-normal) var(--ease-smooth);
}

.p-modal-enter-from,
.p-modal-leave-to {
  opacity: 0;
}

.p-modal-enter-from .p-modal__content,
.p-modal-leave-to .p-modal__content {
  opacity: 0;
  transform: scale(0.96) translateY(20px);
}
</style>
