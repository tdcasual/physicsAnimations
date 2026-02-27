<script setup lang="ts">
import { computed } from "vue";
import type { TaxonomyCategory, TaxonomyGroup } from "../../../features/admin/taxonomyUiState";

const props = defineProps<{
  saving: boolean;
  selectedCategory: TaxonomyCategory;
  allSortedGroups: TaxonomyGroup[];
  canDeleteSelectedCategory: boolean;
  categoryFormGroupId: string;
  categoryFormTitle: string;
  categoryFormOrder: number;
  categoryFormHidden: boolean;
  actionFeedback: string;
  actionFeedbackError: boolean;
}>();

const emit = defineEmits<{
  (event: "update:categoryFormGroupId", value: string): void;
  (event: "update:categoryFormTitle", value: string): void;
  (event: "update:categoryFormOrder", value: number): void;
  (event: "update:categoryFormHidden", value: boolean): void;
  (event: "save-category"): void;
  (event: "reset-or-delete-category"): void;
}>();

const categoryFormGroupIdModel = computed({
  get: () => props.categoryFormGroupId,
  set: (value: string) => emit("update:categoryFormGroupId", value),
});
const categoryFormTitleModel = computed({
  get: () => props.categoryFormTitle,
  set: (value: string) => emit("update:categoryFormTitle", value),
});
const categoryFormOrderModel = computed({
  get: () => props.categoryFormOrder,
  set: (value: number) => emit("update:categoryFormOrder", value),
});
const categoryFormHiddenModel = computed({
  get: () => props.categoryFormHidden,
  set: (value: boolean) => emit("update:categoryFormHidden", value),
});
</script>

<template>
  <div class="panel admin-card">
    <h3>二级分类：{{ selectedCategory.title || selectedCategory.id }} ({{ selectedCategory.id }})</h3>
    <div class="meta-line">
      内容 {{ Number(selectedCategory.count || 0) }} · 内置 {{ Number(selectedCategory.builtinCount || 0) }} · 新增
      {{ Number(selectedCategory.dynamicCount || 0) }}
    </div>

    <div class="form-grid">
      <label class="field">
        <span>大类</span>
        <select v-model="categoryFormGroupIdModel" class="field-input">
          <option v-for="group in allSortedGroups" :key="group.id" :value="group.id">
            {{ group.title || group.id }} ({{ group.id }})
          </option>
        </select>
      </label>

      <label class="field">
        <span>标题</span>
        <input v-model="categoryFormTitleModel" class="field-input" type="text" />
      </label>

      <details class="subaccordion" :open="categoryFormHiddenModel || Number(categoryFormOrderModel || 0) !== 0">
        <summary>高级设置</summary>
        <div class="form-grid subaccordion-body">
          <label class="field">
            <span>排序（越大越靠前）</span>
            <input v-model.number="categoryFormOrderModel" class="field-input" type="number" />
          </label>
          <label class="checkbox">
            <input v-model="categoryFormHiddenModel" type="checkbox" />
            <span>隐藏该分类（首页不显示）</span>
          </label>
        </div>
      </details>
    </div>

    <div class="actions admin-actions">
      <button
        type="button"
        class="btn"
        :class="canDeleteSelectedCategory ? 'btn-danger' : 'btn-ghost'"
        :disabled="saving"
        @click="emit('reset-or-delete-category')"
      >
        {{ canDeleteSelectedCategory ? "删除" : "重置" }}
      </button>
      <button type="button" class="btn btn-primary" :disabled="saving" @click="emit('save-category')">保存</button>
    </div>

    <div
      v-if="actionFeedback"
      class="action-feedback admin-feedback"
      :class="{ error: actionFeedbackError, success: !actionFeedbackError }"
    >
      {{ actionFeedback }}
    </div>

    <div class="hint">提示：要新增二级分类，请先在左侧选择对应的大类。</div>
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

.hint {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 12px;
  color: var(--muted);
  font-size: 13px;
}
</style>
