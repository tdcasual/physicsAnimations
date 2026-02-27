<script setup lang="ts">
import type { AdminItemRow } from "../../../features/admin/adminApi";

interface OptionItem {
  value: string;
  label: string;
}

const props = defineProps<{
  selectedItem: AdminItemRow | null;
  actionFeedback: string;
  actionFeedbackError: boolean;
  groupedCategoryOptions: OptionItem[];
  editTitle: string;
  editDescription: string;
  editCategoryId: string;
  editOrder: number;
  editPublished: boolean;
  editHidden: boolean;
  saving: boolean;
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
}>();
</script>

<template>
  <div class="editor-header">
    <h3>编辑面板</h3>
    <div class="meta" v-if="props.selectedItem">{{ props.selectedItem.id }}</div>
  </div>

  <div
    v-if="props.actionFeedback"
    class="action-feedback admin-feedback"
    :class="{ error: props.actionFeedbackError, success: !props.actionFeedbackError }"
  >
    {{ props.actionFeedback }}
  </div>

  <div v-if="!props.selectedItem" class="empty">请先在左侧选择一条内容进行编辑。</div>

  <div v-else class="editor-form">
    <label class="field">
      <span>标题</span>
      <input
        :value="props.editTitle"
        class="field-input"
        type="text"
        @input="emit('update:editTitle', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label class="field">
      <span>描述</span>
      <textarea
        :value="props.editDescription"
        class="field-input field-textarea"
        @input="emit('update:editDescription', ($event.target as HTMLTextAreaElement).value)"
      />
    </label>

    <div class="form-grid">
      <label class="field">
        <span>分类</span>
        <select
          :value="props.editCategoryId"
          class="field-input"
          @change="emit('update:editCategoryId', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in props.groupedCategoryOptions" :key="option.value" :value="option.value">
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
          @input="emit('update:editOrder', Number(($event.target as HTMLInputElement).value || 0))"
        />
      </label>
    </div>

    <div class="form-grid">
      <label class="checkbox">
        <input
          :checked="props.editPublished"
          type="checkbox"
          @change="emit('update:editPublished', ($event.target as HTMLInputElement).checked)"
        />
        <span>已发布</span>
      </label>

      <label class="checkbox">
        <input
          :checked="props.editHidden"
          type="checkbox"
          @change="emit('update:editHidden', ($event.target as HTMLInputElement).checked)"
        />
        <span>隐藏</span>
      </label>
    </div>

    <div class="editor-footer">
      <div class="actions admin-actions">
        <button type="button" class="btn btn-ghost" @click="emit('reset-edit')">取消</button>
        <button type="button" class="btn btn-primary" :disabled="props.saving" @click="emit('save-edit', props.selectedItem.id)">
          保存
        </button>
      </div>
    </div>
  </div>
</template>
