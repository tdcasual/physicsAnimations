<script setup lang="ts">
import { computed } from "vue";
import type { TaxonomyGroup } from "../../../features/admin/taxonomyUiState";

const props = defineProps<{
  saving: boolean;
  selectedGroup: TaxonomyGroup;
  defaultGroupId: string;
  actionFeedback: string;
  actionFeedbackError: boolean;
  createGroupId: string;
  createGroupTitle: string;
  createGroupOrder: number;
  createGroupHidden: boolean;
  groupFormTitle: string;
  groupFormOrder: number;
  groupFormHidden: boolean;
  createCategoryId: string;
  createCategoryTitle: string;
  createCategoryOrder: number;
  createCategoryHidden: boolean;
}>();

const emit = defineEmits<{
  (event: "update:createGroupId", value: string): void;
  (event: "update:createGroupTitle", value: string): void;
  (event: "update:createGroupOrder", value: number): void;
  (event: "update:createGroupHidden", value: boolean): void;
  (event: "update:groupFormTitle", value: string): void;
  (event: "update:groupFormOrder", value: number): void;
  (event: "update:groupFormHidden", value: boolean): void;
  (event: "update:createCategoryId", value: string): void;
  (event: "update:createCategoryTitle", value: string): void;
  (event: "update:createCategoryOrder", value: number): void;
  (event: "update:createCategoryHidden", value: boolean): void;
  (event: "reset-create-group"): void;
  (event: "create-group"): void;
  (event: "save-group"): void;
  (event: "reset-or-delete-group"): void;
  (event: "reset-create-category"): void;
  (event: "create-category"): void;
}>();

const createGroupIdModel = computed({
  get: () => props.createGroupId,
  set: (value: string) => emit("update:createGroupId", value),
});
const createGroupTitleModel = computed({
  get: () => props.createGroupTitle,
  set: (value: string) => emit("update:createGroupTitle", value),
});
const createGroupOrderModel = computed({
  get: () => props.createGroupOrder,
  set: (value: number) => emit("update:createGroupOrder", value),
});
const createGroupHiddenModel = computed({
  get: () => props.createGroupHidden,
  set: (value: boolean) => emit("update:createGroupHidden", value),
});
const groupFormTitleModel = computed({
  get: () => props.groupFormTitle,
  set: (value: string) => emit("update:groupFormTitle", value),
});
const groupFormOrderModel = computed({
  get: () => props.groupFormOrder,
  set: (value: number) => emit("update:groupFormOrder", value),
});
const groupFormHiddenModel = computed({
  get: () => props.groupFormHidden,
  set: (value: boolean) => emit("update:groupFormHidden", value),
});
const createCategoryIdModel = computed({
  get: () => props.createCategoryId,
  set: (value: string) => emit("update:createCategoryId", value),
});
const createCategoryTitleModel = computed({
  get: () => props.createCategoryTitle,
  set: (value: string) => emit("update:createCategoryTitle", value),
});
const createCategoryOrderModel = computed({
  get: () => props.createCategoryOrder,
  set: (value: number) => emit("update:createCategoryOrder", value),
});
const createCategoryHiddenModel = computed({
  get: () => props.createCategoryHidden,
  set: (value: boolean) => emit("update:createCategoryHidden", value),
});
</script>

<template>
  <div class="panel admin-card">
    <h3>新增大类</h3>
    <div class="form-grid">
      <label class="field">
        <span>大类 ID（英文/数字）</span>
        <input v-model="createGroupIdModel" class="field-input" type="text" />
      </label>

      <label class="field">
        <span>标题</span>
        <input v-model="createGroupTitleModel" class="field-input" type="text" />
      </label>

      <details class="subaccordion" :open="createGroupHiddenModel || Number(createGroupOrderModel || 0) !== 0">
        <summary>高级设置</summary>
        <div class="form-grid subaccordion-body">
          <label class="field">
            <span>排序（越大越靠前）</span>
            <input v-model.number="createGroupOrderModel" class="field-input" type="number" />
          </label>
          <label class="checkbox">
            <input v-model="createGroupHiddenModel" type="checkbox" />
            <span>隐藏该大类（首页不显示）</span>
          </label>
        </div>
      </details>
    </div>

    <div class="actions admin-actions">
      <button type="button" class="btn btn-ghost" :disabled="saving" @click="emit('reset-create-group')">重置</button>
      <button type="button" class="btn btn-primary" :disabled="saving" @click="emit('create-group')">创建</button>
    </div>

    <div
      v-if="actionFeedback"
      class="action-feedback admin-feedback"
      :class="{ error: actionFeedbackError, success: !actionFeedbackError }"
    >
      {{ actionFeedback }}
    </div>

    <div class="panel-divider" />

    <h3>大类：{{ selectedGroup.title || selectedGroup.id }} ({{ selectedGroup.id }})</h3>
    <div class="meta-line">
      分类 {{ Number(selectedGroup.categoryCount || 0) }} · 内容 {{ Number(selectedGroup.count || 0) }}
    </div>

    <div class="form-grid">
      <label class="field field-span">
        <span>标题</span>
        <input v-model="groupFormTitleModel" class="field-input" type="text" />
      </label>

      <details class="subaccordion" :open="groupFormHiddenModel || Number(groupFormOrderModel || 0) !== 0">
        <summary>高级设置</summary>
        <div class="form-grid subaccordion-body">
          <label class="field">
            <span>排序（越大越靠前）</span>
            <input v-model.number="groupFormOrderModel" class="field-input" type="number" />
          </label>
          <label class="checkbox">
            <input v-model="groupFormHiddenModel" type="checkbox" />
            <span>隐藏该大类（首页不显示）</span>
          </label>
        </div>
      </details>
    </div>

    <div class="actions admin-actions">
      <button
        type="button"
        class="btn"
        :class="selectedGroup.id === defaultGroupId ? 'btn-ghost' : 'btn-danger'"
        :disabled="saving"
        @click="emit('reset-or-delete-group')"
      >
        {{ selectedGroup.id === defaultGroupId ? "重置" : "删除" }}
      </button>
      <button type="button" class="btn btn-primary" :disabled="saving" @click="emit('save-group')">保存</button>
    </div>

    <h3>新增二级分类</h3>
    <div class="form-grid">
      <label class="field">
        <span>分类 ID（英文/数字）</span>
        <input id="taxonomy-category-create-id" v-model="createCategoryIdModel" class="field-input" type="text" />
      </label>

      <label class="field">
        <span>标题</span>
        <input v-model="createCategoryTitleModel" class="field-input" type="text" />
      </label>

      <details class="subaccordion" :open="createCategoryHiddenModel || Number(createCategoryOrderModel || 0) !== 0">
        <summary>高级设置</summary>
        <div class="form-grid subaccordion-body">
          <label class="field">
            <span>排序（越大越靠前）</span>
            <input v-model.number="createCategoryOrderModel" class="field-input" type="number" />
          </label>
          <label class="checkbox">
            <input v-model="createCategoryHiddenModel" type="checkbox" />
            <span>隐藏该分类（首页不显示）</span>
          </label>
        </div>
      </details>
    </div>

    <div class="actions admin-actions">
      <button type="button" class="btn btn-ghost" :disabled="saving" @click="emit('reset-create-category')">重置</button>
      <button type="button" class="btn btn-primary" :disabled="saving" @click="emit('create-category')">创建</button>
    </div>
  </div>
</template>

<style scoped>
.panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
  display: grid;
  gap: 10px;
}

h3 {
  margin: 0;
  font-size: 16px;
}

.meta-line {
  color: var(--muted);
  font-size: 12px;
}

.action-feedback {
  font-size: 13px;
  color: var(--muted);
}

.action-feedback.error {
  color: var(--danger);
}

.action-feedback.success {
  color: #15803d;
}

.form-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.field-span {
  grid-column: 1 / -1;
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}

.subaccordion {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 8px;
}

.subaccordion > summary {
  cursor: pointer;
  min-height: 40px;
  padding: 10px 0;
  color: var(--muted);
  font-size: 13px;
}

.subaccordion-body {
  margin-top: 8px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.panel-divider {
  border-top: 1px dashed var(--border);
  margin-top: 2px;
}
</style>
