import { onBeforeUnmount, watch, type Ref } from 'vue'
import { useResponsiveViewport } from './useResponsiveViewport'

export interface UseMobileEditorScrollLockOptions {
  /** 是否打开编辑器 */
  isOpen: Ref<boolean>
  /** 断点宽度，默认 640px */
  breakpoint?: number
}

export interface UseMobileEditorScrollLockReturn {
  /** 当前是否为移动端 viewport */
  isMobileViewport: Ref<boolean>
}

/**
 * 移动端编辑器滚动锁
 * 
 * 统一处理移动端编辑面板的 body 滚动锁，包括 viewport 变化时的自动清理
 * 
 * @example
 * ```ts
 * const isEditorOpen = ref(false)
 * const { isMobileViewport } = useMobileEditorScrollLock({
 *   isOpen: isEditorOpen,
 *   breakpoint: 640
 * })
 * ```
 */
export function useMobileEditorScrollLock(options: UseMobileEditorScrollLockOptions): UseMobileEditorScrollLockReturn {
  const { isOpen, breakpoint = 640 } = options

  let bodyOverflowBeforeSheet = ''

  const { isMobileViewport } = useResponsiveViewport({
    breakpoint,
    onLeaveMobile: () => {
      // 从移动端变为桌面端时，清理滚动锁
      if (isOpen.value) {
        document.body.style.overflow = bodyOverflowBeforeSheet
        bodyOverflowBeforeSheet = ''
      }
    },
  })

  watch(isOpen, (open) => {
    if (open && isMobileViewport.value) {
      // 打开时锁定滚动
      bodyOverflowBeforeSheet = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return
    }

    // 关闭时恢复滚动
    document.body.style.overflow = bodyOverflowBeforeSheet
    bodyOverflowBeforeSheet = ''
  })

  // 组件卸载时清理
  const cleanup = () => {
    document.body.style.overflow = bodyOverflowBeforeSheet
    bodyOverflowBeforeSheet = ''
  }

  // 自动在组件卸载时清理
  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    isMobileViewport,
  }
}

// 重命名导出以保持兼容性
export function useMobileScrollLock(options: UseMobileEditorScrollLockOptions) {
  return useMobileEditorScrollLock(options)
}
