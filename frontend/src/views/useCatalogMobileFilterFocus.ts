import { nextTick, type Ref } from 'vue'

type CreateCatalogMobileFilterFocusParams = {
  panelRef: Ref<HTMLElement | null>
  triggerRef?: Ref<HTMLElement | null>
  maxWidth?: number
  isMobileViewport?: () => boolean
  getViewportHeight?: () => number
}

function createDefaultViewportMatcher(maxWidth: number) {
  return function isMobileViewport() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches
  }
}

function createDefaultViewportHeightReader() {
  return function getViewportHeight() {
    if (typeof window === 'undefined') return 0
    return window.innerHeight || 0
  }
}

export function createCatalogMobileFilterFocus(params: CreateCatalogMobileFilterFocusParams) {
  const {
    panelRef,
    triggerRef,
    maxWidth = 640,
    isMobileViewport = createDefaultViewportMatcher(maxWidth),
    getViewportHeight = createDefaultViewportHeightReader(),
  } = params

  async function focusFilterPanel() {
    if (!isMobileViewport()) return false

    await nextTick()

    if (!panelRef.value) return false

    const viewportHeight = getViewportHeight()
    if (viewportHeight <= 0) return false

    const rect = panelRef.value.getBoundingClientRect()
    const alreadyVisible =
      rect.top < viewportHeight && rect.bottom > 0 && rect.bottom <= viewportHeight
    if (alreadyVisible) return false

    const anchor = triggerRef?.value ?? panelRef.value
    anchor.scrollIntoView({ block: 'start', inline: 'nearest' })
    return true
  }

  return {
    focusFilterPanel,
  }
}
