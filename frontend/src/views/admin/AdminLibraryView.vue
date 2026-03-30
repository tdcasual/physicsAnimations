<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
  import type { LibraryAsset } from '../../features/library/types'
  import { useLibraryAdminState } from '../../features/library/useLibraryAdminState'
  import { createAdminLibraryMobileInspectorFocus } from './library/useAdminLibraryMobileInspectorFocus'
  import AssetPanel from './library/panels/AssetPanel.vue'
  import EmbedPanel from './library/panels/EmbedPanel.vue'
  import EmbedProfileCreatePanel from './library/panels/EmbedProfileCreatePanel.vue'
  import EmbedProfileEditPanel from './library/panels/EmbedProfileEditPanel.vue'
  import FolderPanel from './library/panels/FolderPanel.vue'
  import OperationLogPanel from './library/panels/OperationLogPanel.vue'

  const vm = reactive(useLibraryAdminState())
  type MobileLibrarySheet = 'folder-create' | 'folder' | 'asset' | 'embed' | null

  const librarySidebarTopRef = ref<HTMLElement | null>(null)
  const inspectorTopRef = ref<HTMLElement | null>(null)
  const folderMetaSectionRef = ref<HTMLElement | null>(null)
  const assetEditSectionRef = ref<HTMLElement | null>(null)
  const activeMobileLibrarySheet = ref<MobileLibrarySheet>(null)
  const mobileLibraryToolsOpen = ref(false)
  const mobileDeletedAssetsOpen = ref(false)
  const isMobileLibraryViewport = ref(false)
  const mobileLibrarySheetMaxWidth = 640
  const { focusInspectorTarget } = createAdminLibraryMobileInspectorFocus({
    inspectorTopRef,
    folderMetaSectionRef,
    assetEditSectionRef,
  })
  const isMobileLibrarySheetOpen = computed(() => Boolean(activeMobileLibrarySheet.value))
  const shouldRenderLibraryInspector = computed(
    () => !isMobileLibraryViewport.value || isMobileLibrarySheetOpen.value
  )
  const mobileLibrarySheetTitle = computed(() => {
    if (activeMobileLibrarySheet.value === 'folder-create') return '新建文件夹'
    if (vm.panels.activePanelTab === 'folder') return '文件夹设置'
    if (vm.panels.activePanelTab === 'asset') return '上传与编辑资源'
    if (vm.panels.activePanelTab === 'embed') return 'Embed 平台'
    return '移动端工作台'
  })
  const mobileLibraryTaskSummary = computed(() => {
    if (vm.drafts.editingAssetId && vm.data.editingAsset) {
      return `正在编辑 ${vm.data.editingAsset.displayName || vm.data.editingAsset.fileName || vm.data.editingAsset.id}`
    }
    if (vm.data.selectedFolder) {
      return `当前文件夹含 ${vm.data.selectedFolderAssetCount} 个资源，可继续上传或整理。`
    }
    return '先选文件夹，再上传或整理资源。'
  })
  const mobileLibraryToolsSummary = computed(() => {
    const parts: string[] = []
    const activeFilterCount =
      Number(vm.filters.assetModeFilter !== 'all') +
      Number(vm.filters.assetEmbedProfileFilter !== 'all') +
      Number(vm.filters.assetSortMode !== 'updated_desc')

    if (vm.filters.assetSearchQuery.trim()) parts.push('已搜索')
    if (activeFilterCount > 0) parts.push(`${activeFilterCount} 项筛选`)
    if (vm.selection.selectedAssetCount > 0) parts.push(`已选 ${vm.selection.selectedAssetCount}`)
    if (vm.selection.assetBatchResult) parts.push('批量结果')

    return parts.length > 0 ? parts.join(' · ') : '筛选、排序与批量操作'
  })
  const mobileDeletedAssetsSummary = computed(() => {
    const deletedCount = vm.data.deletedAssets.length
    return deletedCount > 0 ? `${deletedCount} 个已删除资源` : '当前文件夹暂无已删除资源'
  })
  let bodyOverflowBeforeLibrarySheet = ''
  let libraryViewportMediaQuery: MediaQueryList | null = null
  let removeLibraryViewportListener = () => {}

  function isMobileLibrarySheetViewport() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(`(max-width: ${mobileLibrarySheetMaxWidth}px)`).matches
  }

  function syncMobileLibraryViewport(matches: boolean) {
    isMobileLibraryViewport.value = matches
    if (!matches) closeMobileLibrarySheet()
  }

  function openMobileLibrarySheet(sheet: Exclude<MobileLibrarySheet, null>) {
    activeMobileLibrarySheet.value = sheet
  }

  function closeMobileLibrarySheet() {
    activeMobileLibrarySheet.value = null
  }

  function toggleMobileLibraryTools() {
    mobileLibraryToolsOpen.value = !mobileLibraryToolsOpen.value
  }

  function toggleMobileDeletedAssets() {
    mobileDeletedAssetsOpen.value = !mobileDeletedAssetsOpen.value
  }

  async function focusMobileFolderList() {
    closeMobileLibrarySheet()
    await nextTick()
    librarySidebarTopRef.value?.scrollIntoView({ block: 'start', inline: 'nearest' })
  }

  function openMobileFolderCreateSheet() {
    vm.actions.setActivePanelTab('folder')
    openMobileLibrarySheet('folder-create')
  }

  function openMobileAssetSheet() {
    vm.actions.setActivePanelTab('asset')
    openMobileLibrarySheet('asset')
  }

  function openMobileEmbedSheet() {
    vm.actions.setActivePanelTab('embed')
    openMobileLibrarySheet('embed')
  }

  async function openFolderEditor(folderId: string) {
    vm.actions.selectFolder(folderId, { panelTab: 'folder' })
    if (vm.data.selectedFolderId !== folderId || vm.panels.activePanelTab !== 'folder') return
    if (isMobileLibrarySheetViewport()) {
      openMobileLibrarySheet('folder')
      return
    }
    await focusInspectorTarget('folder')
  }

  async function openAssetEditor(asset: LibraryAsset) {
    vm.actions.startEditAsset(asset)
    if (vm.drafts.editingAssetId !== asset.id || vm.panels.activePanelTab !== 'asset') return
    if (isMobileLibrarySheetViewport()) {
      openMobileLibrarySheet('asset')
      return
    }
    await focusInspectorTarget('asset')
  }

  function folderListEmptyText(): string {
    return vm.filters.folderSearchQuery.trim() ? '暂无匹配文件夹。' : '暂无文件夹。'
  }

  function selectedFolderAssetsEmptyText(): string {
    return vm.filters.assetSearchQuery.trim() ||
      vm.filters.assetModeFilter !== 'all' ||
      vm.filters.assetEmbedProfileFilter !== 'all'
      ? '该文件夹暂无匹配资源。'
      : '该文件夹暂无资源。'
  }

  function embedProfilesEmptyText(): string {
    return vm.filters.profileSearchQuery.trim() ? '暂无匹配 Embed 平台。' : '暂无 Embed 平台。'
  }

  watch(isMobileLibrarySheetOpen, open => {
    if (open && isMobileLibrarySheetViewport()) {
      bodyOverflowBeforeLibrarySheet = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return
    }

    document.body.style.overflow = bodyOverflowBeforeLibrarySheet
    bodyOverflowBeforeLibrarySheet = ''
  })

  watch(
    () => vm.data.selectedFolderId,
    () => {
      mobileLibraryToolsOpen.value = false
      mobileDeletedAssetsOpen.value = false
    }
  )

  onBeforeUnmount(() => {
    document.body.style.overflow = bodyOverflowBeforeLibrarySheet
    removeLibraryViewportListener()
  })

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    libraryViewportMediaQuery = window.matchMedia(`(max-width: ${mobileLibrarySheetMaxWidth}px)`)
    syncMobileLibraryViewport(libraryViewportMediaQuery.matches)
    const handleChange = (event: MediaQueryListEvent) => {
      syncMobileLibraryViewport(event.matches)
    }
    if (typeof libraryViewportMediaQuery.addEventListener === 'function') {
      libraryViewportMediaQuery.addEventListener('change', handleChange)
      removeLibraryViewportListener = () => {
        libraryViewportMediaQuery?.removeEventListener('change', handleChange)
      }
      return
    }
    libraryViewportMediaQuery.addListener(handleChange)
    removeLibraryViewportListener = () => {
      libraryViewportMediaQuery?.removeListener(handleChange)
    }
  })
</script>

<template src="./library/AdminLibraryView.template.html"></template>

<style scoped src="./library/AdminLibraryView.css"></style>
