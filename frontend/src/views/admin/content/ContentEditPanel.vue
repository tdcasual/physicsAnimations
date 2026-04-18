<script setup lang="ts">
import type { AdminItemRow } from "../../../features/admin/adminApi";

import { PAActions, PAButton, PAField, PAInput } from "@/components/ui/patterns";

interface OptionItem {
  value: string;
  label: string;
}

const props = defineProps<{
  selectedItem: AdminItemRow | null;
  actionFeedback: string;
  actionFeedbackError: boolean;
  groupedCategoryOptions: OptionItem[];
  editTitleError: string;
  editTitle: string;
  editDescription: string;
  editCategoryId: string;
  editOrder: number;
  editPublished: boolean;
  editHidden: boolean;
  saving: boolean;
  showSheetClose?: boolean;
}>();

const emit = defineEmits<{
  "update:editTitle": [value: string];
  "update:editDescription": [value: string];
  "update:editCategoryId": [value: string];
  "update:editOrder": [value: number];
  "update:editPublished": [value: boolean];
  "update:editHidden": [value: boolean];
  "reset-edit": [];
  "save-edit": [id: string];
  "close-edit": [];
}>();
</script>

<template>
  <div class="editor-header">
    <div class="editor-header-copy">
      <h3>编辑面板</h3>
      <div class="meta" v-if="props.selectedItem">{{ props.selectedItem.id }}</div>
    </div>
    <PAButton v-if="props.showSheetClose" variant="ghost" class="editor-close" :disabled="props.saving" @click="emit('close-edit')">
      收起
    </PAButton>
  </div>

  <div
    v-if="props.actionFeedback"
    class="admin-feedback"
    :class="{ error: props.actionFeedbackError, success: !props.actionFeedbackError }"
  >
    {{ props.actionFeedback }}
  </div>

  <div v-if="!props.selectedItem" class="empty">选择条目以编辑</div>

  <div v-else class="editor-form">
    <PAField :error="props.editTitleError">
      <template #label>标题</template>
      <PAInput
        :model-value="props.editTitle"
        :variant="props.editTitleError ? 'error' : 'default'"
        :disabled="props.saving"
        @update:model-value="emit('update:editTitle', $event)"
      />
    </PAField>

    <PAField>
      <template #label>描述</template>
      <PAInput
        :model-value="props.editDescription"
        type="textarea"
        size="textarea"
        :disabled="props.saving"
        @update:model-value="emit('update:editDescription', $event)"
      />
    </PAField>

    <div class="form-grid">
      <PAField>
        <template #label>分类</template>
        <select
          :value="props.editCategoryId"
          class="flex w-full rounded-md border border-input bg-background px-3 py-2 h-10"
          :disabled="props.saving"
          @change="emit('update:editCategoryId', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in props.groupedCategoryOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </PAField>

      <PAField>
        <template #label>排序（越大越靠前）</template>
        <PAInput
          :model-value="props.editOrder"
          type="number"
          :disabled="props.saving"
          @update:model-value="emit('update:editOrder', Number($event || 0))"
        />
      </PAField>
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
      <PAActions align="end">
        <PAButton variant="ghost" :disabled="props.saving" @click="emit('reset-edit')">取消</PAButton>
        <PAButton :disabled="props.saving" @click="emit('save-edit', props.selectedItem.id)">
          保存
        </PAButton>
      </PAActions>
    </div>
  </div>
</template>

<style scoped>
@import "../shared/admin-edit-panel.css";

.editor-form {
  display: grid;
  gap: 16px;
}

.editor-footer {
  display: grid;
  gap: 12px;
}

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
    background: linear-gradient(180deg, color-mix(in oklab, var(--card) 10%, transparent), var(--card) 28%);
  }
}
</style>
