import { nextTick, type Ref } from 'vue'

export type AdminLibraryInspectorFocusTarget = 'folder' | 'asset'

type CreateAdminLibraryMobileInspectorFocusParams = {
  inspectorTopRef: Ref<HTMLElement | null>
  folderMetaSectionRef: Ref<HTMLElement | null>
  assetEditSectionRef: Ref<HTMLElement | null>
  isMobileViewport?: () => boolean
}

function isMobileLibraryViewport() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(max-width: 900px)').matches
}

export function createAdminLibraryMobileInspectorFocus(
  params: CreateAdminLibraryMobileInspectorFocusParams
) {
  const {
    inspectorTopRef,
    folderMetaSectionRef,
    assetEditSectionRef,
    isMobileViewport = isMobileLibraryViewport,
  } = params

  async function focusInspectorTarget(target: AdminLibraryInspectorFocusTarget) {
    if (!isMobileViewport()) return false

    await nextTick()

    const destination =
      (target === 'folder' ? folderMetaSectionRef.value : assetEditSectionRef.value) ??
      inspectorTopRef.value

    if (!destination) return false

    destination.scrollIntoView({ block: 'start', inline: 'nearest' })
    return true
  }

  return {
    focusInspectorTarget,
  }
}
