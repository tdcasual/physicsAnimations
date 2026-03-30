<script setup lang="ts">
  /**
   * AdminWorkspaceLayout
   *
   * 管理工作区布局组件
   * 提供列表面板和编辑面板的响应式布局
   * 支持移动端抽屉式编辑面板
   *
   * @example
   * <AdminWorkspaceLayout>
   *   <template #header>
   *     <h2>页面标题</h2>
   *   </template>
   *   <template #list>
   *     <DataList />
   *   </template>
   *   <template #editor>
   *     <EditorPanel />
   *   </template>
   * </AdminWorkspaceLayout>
   */
  import { computed, ref, watch, onBeforeUnmount } from 'vue'

  interface Props {
    /** 是否显示编辑面板 */
    isEditorOpen?: boolean
    /** 移动端抽屉断点（像素） */
    mobileSheetBreakpoint?: number
    /** 是否禁用 body 滚动（移动端打开抽屉时） */
    disableBodyScroll?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    isEditorOpen: false,
    mobileSheetBreakpoint: 640,
    disableBodyScroll: true,
  })

  const emit = defineEmits<{
    /** 关闭编辑器 */
    (e: 'close'): void
  }>()

  const editorPanelRef = ref<HTMLElement | null>(null)
  let bodyOverflowBeforeSheet = ''

  const isMobileSheetViewport = computed(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(`(max-width: ${props.mobileSheetBreakpoint}px)`).matches
  })

  // 处理 body 滚动
  watch(
    () => props.isEditorOpen,
    open => {
      if (!props.disableBodyScroll) return

      if (open && isMobileSheetViewport.value) {
        bodyOverflowBeforeSheet = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return
      }

      document.body.style.overflow = bodyOverflowBeforeSheet
      bodyOverflowBeforeSheet = ''
    }
  )

  onBeforeUnmount(() => {
    if (props.disableBodyScroll) {
      document.body.style.overflow = bodyOverflowBeforeSheet
    }
  })

  // 暴露编辑器面板 ref，供父组件控制焦点
  defineExpose({
    editorPanelRef,
    focusEditor: async () => {
      if (!editorPanelRef.value) return
      await new Promise(resolve => requestAnimationFrame(resolve))
      editorPanelRef.value.focus?.()
      editorPanelRef.value.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
    },
  })
</script>

<template>
  <section class="admin-workspace-layout">
    <header v-if="$slots.header" class="admin-workspace-header">
      <slot name="header" />
    </header>

    <div class="admin-workspace-grid">
      <!-- 列表面板 -->
      <div class="admin-workspace-list admin-card">
        <slot name="list" />
      </div>

      <!-- 移动端遮罩 -->
      <button
        v-if="isEditorOpen"
        type="button"
        class="admin-workspace-backdrop"
        aria-label="关闭编辑面板"
        @click="emit('close')"
      />

      <!-- 编辑面板 -->
      <aside
        ref="editorPanelRef"
        :class="[
          'admin-workspace-editor',
          'admin-card',
          'admin-mobile-focus-anchor',
          { 'is-open': isEditorOpen },
        ]"
        tabindex="-1"
      >
        <slot name="editor" />
      </aside>
    </div>
  </section>
</template>

<style scoped>
  .admin-workspace-layout {
    display: grid;
    gap: 14px;
  }

  .admin-workspace-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .admin-workspace-grid {
    display: grid;
    grid-template-columns: 1fr minmax(320px, 420px);
    gap: 16px;
    align-items: start;
  }

  .admin-workspace-list,
  .admin-workspace-editor {
    align-content: start;
  }

  .admin-workspace-editor {
    position: sticky;
    align-self: start;
    top: calc(var(--app-topbar-height, 0px) + 12px);
    max-height: calc(100dvh - var(--app-topbar-height, 0px) - 32px);
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  .admin-workspace-backdrop {
    display: none;
  }

  .admin-mobile-focus-anchor {
    scroll-margin-top: calc(var(--app-topbar-height, 0px) + 16px);
  }

  /* 平板响应式 */
  @media (max-width: 1024px) {
    .admin-workspace-grid {
      grid-template-columns: 1fr;
    }

    .admin-workspace-editor {
      position: static;
      top: auto;
      max-height: none;
      overflow: visible;
    }
  }

  /* 移动端抽屉响应式 */
  @media (max-width: 640px) {
    .admin-workspace-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      z-index: calc(var(--z-modal, 1000) - 2);
      border: 0;
      padding: 0;
      background: oklch(16% 0.025 250 / 0.32);
    }

    .admin-workspace-editor {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 0;
      top: auto;
      z-index: calc(var(--z-modal, 1000) - 1);
      max-height: min(78dvh, 720px);
      overflow: auto;
      border-radius: 22px 22px 0 0;
      box-shadow: 0 -20px 48px -30px color-mix(in oklab, var(--accent, #666) 28%, transparent);
      transform: translateY(calc(100% + 16px));
      transition: transform 180ms ease;
      pointer-events: none;
    }

    .admin-workspace-editor.is-open {
      transform: translateY(0);
      pointer-events: auto;
    }
  }
</style>
