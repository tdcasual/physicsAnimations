<script setup lang="ts">
import { computed } from "vue";
import type { TaxonomyCategory, TaxonomyGroup } from "../../../features/admin/taxonomyUiState";
import { PAButton, PACard, PAField, PAInput, PAActions } from "@/components/ui/patterns";

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
  <PACard variant="admin" class="panel p-3">
    <h3 class="admin-panel-title break-anywhere">二级分类：{{ selectedCategory.title || selectedCategory.id }} ({{ selectedCategory.id }})</h3>
    <div class="meta-line">
      内容 {{ Number(selectedCategory.count || 0) }} · 新增 {{ Number(selectedCategory.dynamicCount || 0) }}
    </div>

    <div class="form-grid">
      <PAField>
        <template #label>大类</template>
        <select v-model="categoryFormGroupIdModel" class="flex w-full rounded-md border border-input bg-background px-3 py-2 h-10 text-sm" :disabled="saving">
          <option v-for="group in allSortedGroups" :key="group.id" :value="group.id">
            {{ group.title || group.id }} ({{ group.id }})
          </option>
        </select>
      </PAField>

      <PAField>
        <template #label>标题</template>
        <PAInput v-model="categoryFormTitleModel" :disabled="saving" />
      </PAField>

      <details class="subaccordion" :open="categoryFormHiddenModel || Number(categoryFormOrderModel || 0) !== 0">
        <summary>高级设置</summary>
        <div class="form-grid subaccordion-body">
          <PAField>
            <template #label>排序（越大越靠前）</template>
            <PAInput v-model="categoryFormOrderModel" type="number" :disabled="saving" />
          </PAField>
          <label class="checkbox">
            <input v-model="categoryFormHiddenModel" type="checkbox" :disabled="saving" />
            <span>隐藏该分类（首页不显示）</span>
          </label>
        </div>
      </details>
    </div>

    <PAActions align="end">
      <PAButton
        :variant="canDeleteSelectedCategory ? 'destructive' : 'ghost'"
        :disabled="saving"
        @click="emit('reset-or-delete-category')"
      >
        {{ canDeleteSelectedCategory ? "删除" : "重置" }}
      </PAButton>
      <PAButton :disabled="saving" @click="emit('save-category')">保存</PAButton>
    </PAActions>

    <div
      v-if="actionFeedback"
      class="admin-feedback"
      :class="{ error: actionFeedbackError, success: !actionFeedbackError }"
    >
      {{ actionFeedback }}
    </div>

    <div class="hint">选择大类后可新增分类</div>
  </PACard>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 10px;
}

.meta-line {
  color: var(--muted);
  font-size: calc(12px * var(--ui-scale));
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
  font-size: calc(13px * var(--ui-scale));
  color: var(--muted);
}

.subaccordion {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 8px;
}

.subaccordion > summary {
  cursor: pointer;
  min-height: 44px;
  padding: 10px 0;
  color: var(--muted);
  font-size: calc(13px * var(--ui-scale));
}

.subaccordion-body {
  margin-top: 8px;
}

.hint {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 12px;
  color: var(--muted);
  font-size: calc(13px * var(--ui-scale));
}
</style>
