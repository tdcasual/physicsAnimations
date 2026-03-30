import { ref, onUnmounted, type Ref } from 'vue'

/**
 * 焦点陷阱 (Focus Trap)
 *
 * 将焦点限制在指定元素内，用于模态框、对话框等组件
 *
 * @example
 * const { trapRef, activate, deactivate } = useFocusTrap()
 * // trapRef 绑定到容器元素
 * // activate() 激活焦点陷阱
 * // deactivate() 取消焦点陷阱
 */
export function useFocusTrap() {
  const trapRef: Ref<HTMLElement | null> = ref(null)
  let previousActiveElement: Element | null = null
  let isActive = false

  function getFocusableElements(): HTMLElement[] {
    if (!trapRef.value) return []

    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    return Array.from(trapRef.value.querySelectorAll(selector)).filter((el): el is HTMLElement => {
      return (
        el instanceof HTMLElement &&
        el.offsetParent !== null && // 可见
        !el.hasAttribute('disabled') &&
        !el.getAttribute('aria-hidden')
      )
    })
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!isActive || event.key !== 'Tab') return

    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement as HTMLElement

    // Shift + Tab: 向后导航
    if (event.shiftKey) {
      if (activeElement === firstElement || !trapRef.value?.contains(activeElement)) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab: 向前导航
      if (activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  function activate() {
    if (isActive) return

    previousActiveElement = document.activeElement
    isActive = true

    // 聚焦到第一个可聚焦元素
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    document.addEventListener('keydown', handleKeyDown)
  }

  function deactivate(returnFocus = true) {
    if (!isActive) return

    isActive = false
    document.removeEventListener('keydown', handleKeyDown)

    // 恢复之前的焦点
    if (returnFocus && previousActiveElement instanceof HTMLElement) {
      previousActiveElement.focus()
    }
  }

  onUnmounted(() => {
    deactivate()
  })

  return {
    trapRef,
    activate,
    deactivate,
    isActive: () => isActive,
  }
}

export default useFocusTrap
