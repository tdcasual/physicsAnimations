<script setup lang="ts">
  /**
   * EditorPanel
   *
   * 编辑面板组件
   * 提供一致的编辑表单布局和操作反馈
   *
   * @example
   * <EditorPanel
   *   title="编辑项目"
   *   :feedback="feedbackText"
   *   :feedback-error="isError"
   *   :saving="saving"
   *   @save="handleSave"
   *   @cancel="handleCancel"
   * >
   *   <FormField label="名称"><input v-model="name" /></FormField>
   * </EditorPanel>
   */
  interface Props {
    /** 面板标题 */
    title?: string
    /** 副标题 */
    subtitle?: string
    /** 反馈文本 */
    feedback?: string
    /** 是否为错误反馈 */
    feedbackError?: boolean
    /** 是否为成功反馈 */
    feedbackSuccess?: boolean
    /** 保存中状态 */
    saving?: boolean
    /** 保存按钮文本 */
    saveText?: string
    /** 取消按钮文本 */
    cancelText?: string
    /** 是否显示关闭按钮 */
    showClose?: boolean
  }

  withDefaults(defineProps<Props>(), {
    title: '',
    subtitle: '',
    feedback: '',
    feedbackError: false,
    feedbackSuccess: false,
    saving: false,
    saveText: '保存',
    cancelText: '取消',
    showClose: false,
  })

  defineEmits<{
    /** 保存 */
    (e: 'save'): void
    /** 取消 */
    (e: 'cancel'): void
    /** 关闭 */
    (e: 'close'): void
  }>()
</script>

<template>
  <div class="editor-panel">
    <!-- 头部 -->
    <header class="editor-panel-header">
      <div class="editor-panel-titles">
        <h3 v-if="title" class="editor-panel-title">{{ title }}</h3>
        <p v-if="subtitle" class="editor-panel-subtitle">{{ subtitle }}</p>
      </div>
      <button
        v-if="showClose"
        type="button"
        class="editor-panel-close"
        aria-label="关闭"
        @click="$emit('close')"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </header>

    <!-- 表单内容 -->
    <div class="editor-panel-body">
      <slot />
    </div>

    <!-- 底部操作 -->
    <footer class="editor-panel-footer">
      <div
        v-if="feedback"
        :class="['editor-panel-feedback', { error: feedbackError, success: feedbackSuccess }]"
      >
        {{ feedback }}
      </div>

      <div class="editor-panel-actions">
        <slot name="actions">
          <button
            type="button"
            class="editor-panel-btn editor-panel-btn--secondary"
            :disabled="saving"
            @click="$emit('cancel')"
          >
            {{ cancelText }}
          </button>
          <button
            type="button"
            class="editor-panel-btn editor-panel-btn--primary"
            :disabled="saving"
            @click="$emit('save')"
          >
            {{ saving ? '保存中...' : saveText }}
          </button>
        </slot>
      </div>
    </footer>
  </div>
</template>

<style scoped>
  .editor-panel {
    display: grid;
    gap: 16px;
    padding: 16px;
  }

  .editor-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border, #e5e7eb);
  }

  .editor-panel-titles {
    display: grid;
    gap: 4px;
  }

  .editor-panel-title {
    margin: 0;
    font-size: calc(16px * var(--ui-scale, 1));
    font-weight: 600;
    color: var(--text, #374151);
  }

  .editor-panel-subtitle {
    margin: 0;
    font-size: calc(13px * var(--ui-scale, 1));
    color: var(--muted, #6b7280);
  }

  .editor-panel-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--muted, #6b7280);
    cursor: pointer;
    transition:
      background-color 150ms ease,
      color 150ms ease;
    flex-shrink: 0;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .editor-panel-close:hover {
    background: color-mix(in srgb, var(--muted, #6b7280) 10%, transparent);
    color: var(--text, #374151);
  }

  .editor-panel-body {
    display: grid;
    gap: 12px;
  }

  .editor-panel-footer {
    display: grid;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border, #e5e7eb);
  }

  .editor-panel-feedback {
    font-size: calc(13px * var(--ui-scale, 1));
    color: var(--muted, #6b7280);
  }

  .editor-panel-feedback.error {
    color: var(--danger, #dc2626);
  }

  .editor-panel-feedback.success {
    color: var(--success, #16a34a);
  }

  .editor-panel-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .editor-panel-btn {
    padding: 10px 18px;
    min-height: 44px;
    border-radius: 8px;
    font-size: calc(14px * var(--ui-scale, 1));
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 150ms ease,
      opacity 150ms ease;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .editor-panel-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .editor-panel-btn--primary {
    border: 1px solid var(--primary, #3b82f6);
    background: var(--primary, #3b82f6);
    color: white;
  }

  .editor-panel-btn--primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary, #3b82f6) 90%, black);
    border-color: color-mix(in srgb, var(--primary, #3b82f6) 90%, black);
  }

  .editor-panel-btn--secondary {
    border: 1px solid var(--border, #e5e7eb);
    background: var(--surface, #fff);
    color: var(--text, #374151);
  }

  .editor-panel-btn--secondary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface, #fff) 95%, var(--text, #374151));
  }

  .editor-panel-btn--danger {
    border: 1px solid var(--danger, #dc2626);
    background: var(--danger, #dc2626);
    color: white;
  }

  .editor-panel-btn--danger:hover:not(:disabled) {
    background: color-mix(in srgb, var(--danger, #dc2626) 90%, black);
    border-color: color-mix(in srgb, var(--danger, #dc2626) 90%, black);
  }

  /* 平板响应式优化 */
  @media (max-width: 1024px) {
    .editor-panel {
      padding: 20px;
    }
    
    .editor-panel-footer {
      position: sticky;
      bottom: 0;
      background: var(--surface, #fff);
      padding: 16px 0;
      margin: 0 -4px;
      z-index: 10;
    }
  }
  
  @media (max-width: 640px) {
    .editor-panel {
      padding: 16px;
    }
    
    .editor-panel-actions {
      flex-direction: column;
    }
    
    .editor-panel-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
