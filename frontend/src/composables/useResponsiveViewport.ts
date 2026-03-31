import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

export interface UseResponsiveViewportOptions {
  /** 断点宽度，默认 640px */
  breakpoint?: number
  /** 当 viewport 从移动端变为桌面端时的回调 */
  onLeaveMobile?: () => void
  /** 当 viewport 从桌面端变为移动端时的回调 */
  onEnterMobile?: () => void
}

export interface UseResponsiveViewportReturn {
  /** 当前是否为移动端 viewport */
  isMobileViewport: Ref<boolean>
  /** 手动检查当前 viewport */
  checkViewport: () => boolean
}

/**
 * 响应式 Viewport 监听
 * 
 * 统一处理移动端/桌面端 viewport 变化的 composable
 * 解决了在抽屉/面板打开时窗口大小变化导致的状态不一致问题
 * 
 * @example
 * ```ts
 * const { isMobileViewport } = useResponsiveViewport({
 *   breakpoint: 640,
 *   onLeaveMobile: () => {
 *     // 关闭移动端面板，清理滚动锁
 *     closeMobilePanel()
 *     document.body.style.overflow = ''
 *   }
 * })
 * ```
 */
export function useResponsiveViewport(options: UseResponsiveViewportOptions = {}): UseResponsiveViewportReturn {
  const {
    breakpoint = 640,
    onLeaveMobile,
    onEnterMobile,
  } = options

  const isMobileViewport = ref(false)
  let mediaQuery: MediaQueryList | null = null
  let removeListener = () => {}

  function handleViewportChange(event: MediaQueryListEvent | MediaQueryList) {
    const matches = 'matches' in event ? event.matches : (event as MediaQueryList).matches
    const wasMobile = isMobileViewport.value
    isMobileViewport.value = matches

    // 从移动端变为桌面端
    if (wasMobile && !matches && onLeaveMobile) {
      onLeaveMobile()
    }
    // 从桌面端变为移动端
    if (!wasMobile && matches && onEnterMobile) {
      onEnterMobile()
    }
  }

  function checkViewport(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)
    isMobileViewport.value = mediaQuery.matches

    const handleChange = (event: MediaQueryListEvent) => {
      handleViewportChange(event)
    }

    // 使用标准 API，降级处理旧版 Safari
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      removeListener = () => {
        mediaQuery?.removeEventListener('change', handleChange)
      }
    } else {
      // 旧版 Safari 兼容
      mediaQuery.addListener(handleChange)
      removeListener = () => {
        mediaQuery?.removeListener(handleChange)
      }
    }
  })

  onBeforeUnmount(() => {
    removeListener()
  })

  return {
    isMobileViewport,
    checkViewport,
  }
}
