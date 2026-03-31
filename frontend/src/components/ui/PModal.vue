<script setup lang="ts">
  import { onUnmounted, watch, ref, nextTick } from 'vue'

  interface Props {
    modelValue?: boolean
    title?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    closable?: boolean
    maskClosable?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    size: 'md',
    closable: true,
    maskClosable: true,
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
      return
    }
    
    // Tab键焦点陷阱
    if (e.key === 'Tab' && props.modelValue && wrapperRef.value) {
      const focusableElements = wrapperRef.value.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      if (focusableElements.length === 0) return
      
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
      
      if (e.shiftKey) {
        // Shift+Tab: 向后循环
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        // Tab: 向前循环
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }
  }

  const maskRef = ref<HTMLElement | null>(null)
  const wrapperRef = ref<HTMLElement | null>(null)
  let previouslyFocusedElement: HTMLElement | null = null
  
  function onTouchMove(e: TouchEvent) {
    // 阻止滚动穿透
    if (e.target === maskRef.value) {
      e.preventDefault()
    }
  }
  
  // 焦点管理：将焦点移到模态框内
  function focusModal() {
    nextTick(() => {
      // 保存之前聚焦的元素
      previouslyFocusedElement = document.activeElement as HTMLElement
      
      // 尝试聚焦到关闭按钮或模态框内容
      const focusableElement = wrapperRef.value?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      
      if (focusableElement) {
        focusableElement.focus()
      } else {
        wrapperRef.value?.focus()
      }
    })
  }
  
  // 恢复焦点
  function restoreFocus() {
    if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
      previouslyFocusedElement.focus()
    }
  }

  // 监听modelValue变化，动态添加/移除事件监听
  watch(
    () => props.modelValue,
    (isOpen, wasOpen) => {
      if (isOpen && !wasOpen) {
        // 打开时添加监听器、阻止滚动、管理焦点
        document.addEventListener('keydown', onKeydown)
        document.body.style.overflow = 'hidden'
        focusModal()
      } else if (!isOpen && wasOpen) {
        // 关闭时移除监听器、恢复滚动、恢复焦点
        document.removeEventListener('keydown', onKeydown)
        document.body.style.overflow = ''
        restoreFocus()
      }
    }
  )

  onUnmounted(() => {
    // 确保清理
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  })
</script>

<template>
  <Teleport to="body">
    <Transition name="p-modal">
      <div 
        v-show="modelValue" 
        class="p-modal" 
        role="dialog"
        aria-modal="true"
        :aria-label="title || '对话框'"
        @touchmove="onTouchMove"
      >
        <div 
          ref="maskRef"
          class="p-modal__mask" 
          @click="onMaskClick" 
          @touchstart.passive="onMaskClick"
        />
        <div class="p-modal__wrapper" ref="wrapperRef">
          <div class="p-modal__content" :class="`p-modal__content--${size}`">
            <div v-if="title || closable" class="p-modal__header">
              <h3 v-if="title" class="p-modal__title" id="modal-title">{{ title }}</h3>
              <button 
                v-if="closable" 
                type="button" 
                class="p-modal__close" 
                aria-label="关闭对话框"
                @click="close"
              >
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
    max-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px);
    max-height: calc(100vh - 32px); /* fallback */
    overflow: auto;
    padding: var(--space-4);
    -webkit-overflow-scrolling: touch;
  }

  .p-modal__mask {
    touch-action: manipulation;
  }

  .p-modal__close {
    min-width: 44px;
    min-height: 44px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .p-modal__content {
    background: var(--surface-card);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    overflow: hidden;
  }

  .p-modal__content--sm {
    width: 400px;
  }
  .p-modal__content--md {
    width: 520px;
  }
  .p-modal__content--lg {
    width: 720px;
  }
  .p-modal__content--xl {
    width: 920px;
  }
  
  /* 平板适配 */
  @media (max-width: 1024px) {
    .p-modal__content--lg,
    .p-modal__content--xl {
      width: 90vw;
      max-width: 680px;
    }
    
    .p-modal__content--md {
      width: 85vw;
      max-width: 520px;
    }
  }
  
  @media (max-width: 640px) {
    .p-modal__content--lg,
    .p-modal__content--xl,
    .p-modal__content--md,
    .p-modal__content--sm {
      width: calc(100vw - 32px);
      max-width: none;
    }
  }

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
