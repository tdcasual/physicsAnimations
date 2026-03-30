<script setup lang="ts">
  import type { AdminItemRow } from '../../../features/admin/adminApi'

  interface OptionItem {
    value: string
    label: string
  }

  const props = defineProps<{
    selectedItem: AdminItemRow | null
    actionFeedback: string
    actionFeedbackError: boolean
    groupedCategoryOptions: OptionItem[]
    editTitleError: string
    editTitle: string
    editDescription: string
    editCategoryId: string
    editOrder: number
    editPublished: boolean
    editHidden: boolean
    saving: boolean
    showSheetClose?: boolean
  }>()

  const emit = defineEmits<{
    'update:editTitle': [value: string]
    'update:editDescription': [value: string]
    'update:editCategoryId': [value: string]
    'update:editOrder': [value: number]
    'update:editPublished': [value: boolean]
    'update:editHidden': [value: boolean]
    'reset-edit': []
    'save-edit': [id: string]
    'close-edit': []
  }>()
</script>

<template>
  <div class="editor-header">
    <div class="editor-header-copy">
      <h3>编辑面板</h3>
      <div v-if="props.selectedItem" class="meta">{{ props.selectedItem.id }}</div>
    </div>
    <button
      v-if="props.showSheetClose"
      type="button"
      class="btn btn-ghost editor-close"
      :disabled="props.saving"
      @click="emit('close-edit')"
    >
      收起
    </button>
  </div>

  <div
    v-if="props.actionFeedback"
    class="action-feedback admin-feedback"
    :class="{ error: props.actionFeedbackError, success: !props.actionFeedbackError }"
  >
    {{ props.actionFeedback }}
  </div>

  <div v-if="!props.selectedItem" class="empty">选择条目以编辑</div>

  <div v-else class="editor-form">
    <label class="field" :class="{ 'has-error': props.editTitleError }">
      <span>标题</span>
      <input
        :value="props.editTitle"
        class="field-input"
        type="text"
        :disabled="props.saving"
        @input="emit('update:editTitle', ($event.target as HTMLInputElement).value)"
      />
      <div v-if="props.editTitleError" class="field-error-text">{{ props.editTitleError }}</div>
    </label>

    <label class="field">
      <span>描述</span>
      <textarea
        :value="props.editDescription"
        class="field-input field-textarea"
        :disabled="props.saving"
        @input="emit('update:editDescription', ($event.target as HTMLTextAreaElement).value)"
      />
    </label>

    <div class="form-grid">
      <label class="field">
        <span>分类</span>
        <select
          :value="props.editCategoryId"
          class="field-input"
          :disabled="props.saving"
          @change="emit('update:editCategoryId', ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="option in props.groupedCategoryOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>排序（越大越靠前）</span>
        <input
          :value="props.editOrder"
          class="field-input"
          type="number"
          :disabled="props.saving"
          @input="emit('update:editOrder', Number(($event.target as HTMLInputElement).value || 0))"
        />
      </label>
    </div>

    <div class="form-grid">
      <label class="checkbox">
        <input
          :checked="props.editPublished"
          type="checkbox"
          :disabled="props.saving"
          @change="emit('update:editPublished', ($event.target as HTMLInputElement).checked)"
        />
        <span>已发布</span>
      </label>

      <label class="checkbox">
        <input
          :checked="props.editHidden"
          type="checkbox"
          :disabled="props.saving"
          @change="emit('update:editHidden', ($event.target as HTMLInputElement).checked)"
        />
        <span>隐藏</span>
      </label>
    </div>

    <div class="editor-footer">
      <div class="actions admin-actions">
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="props.saving"
          @click="emit('reset-edit')"
          >取消</button
        >
        <button
          type="button"
          class="btn btn-primary"
          :disabled="props.saving"
          @click="emit('save-edit', props.selectedItem.id)"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .editor-header-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .editor-close {
    display: none;
  }

  @media (max-width: 640px) {
    .editor-header {
      align-items: flex-start;
    }

    .editor-close {
      display: inline-flex;
      min-height: 38px;
      padding-inline: 12px;
      white-space: nowrap;
    }

    .editor-footer {
      position: sticky;
      bottom: 0;
      margin-inline: -2px;
      padding-top: 12px;
      background: linear-gradient(
        180deg,
        color-mix(in oklab, var(--surface) 10%, transparent),
        var(--surface) 28%
      );
    }
  }
</style>
