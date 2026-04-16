<script setup lang="ts">
import { computed } from "vue";
import type { TaxonomyGroup } from "../../../features/admin/taxonomyUiState";
import { PAButton, PACard, PAField, PAInput, PAActions } from "@/components/ui/patterns";

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
  createOnly?: boolean;
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
  <PACard variant="admin" class="panel p-3">
    <h3 class="admin-panel-title">新增大类</h3>
    <div class="form-grid">
      <PAField>
        <template #label>大类 ID（英文/数字）</template>
        <PAInput v-model="createGroupIdModel" :disabled="saving" />
      </PAField>

      <PAField>
        <template #label>标题</template>
        <PAInput v-model="createGroupTitleModel" :disabled="saving" />
      </PAField>

      <details class="subaccordion" :open="createGroupHiddenModel || Number(createGroupOrderModel || 0) !== 0">
        <summary>高级设置</summary>
        <div class="form-grid subaccordion-body">
          <PAField>
            <template #label>排序（越大越靠前）</template>
            <PAInput v-model="createGroupOrderModel" type="number" :disabled="saving" />
          </PAField>
          <label class="checkbox">
            <input v-model="createGroupHiddenModel" type="checkbox" :disabled="saving" />
            <span>隐藏该大类（首页不显示）</span>
          </label>
        </div>
      </details>
    </div>

    <PAActions align="end">
      <PAButton variant="ghost" :disabled="saving" @click="emit('reset-create-group')">重置</PAButton>
      <PAButton :disabled="saving" @click="emit('create-group')">创建</PAButton>
    </PAActions>

    <div
      v-if="actionFeedback"
      class="admin-feedback"
      :class="{ error: actionFeedbackError, success: !actionFeedbackError }"
    >
      {{ actionFeedback }}
    </div>

    <template v-if="!createOnly">
      <div class="panel-divider" />

      <h3 class="admin-panel-title break-anywhere">大类：{{ selectedGroup.title || selectedGroup.id }} ({{ selectedGroup.id }})</h3>
      <div class="meta-line">
        分类 {{ Number(selectedGroup.categoryCount || 0) }} · 内容 {{ Number(selectedGroup.count || 0) }}
      </div>

      <div class="form-grid">
        <PAField class="field-span">
          <template #label>标题</template>
          <PAInput v-model="groupFormTitleModel" :disabled="saving" />
        </PAField>

        <details class="subaccordion" :open="groupFormHiddenModel || Number(groupFormOrderModel || 0) !== 0">
          <summary>高级设置</summary>
          <div class="form-grid subaccordion-body">
            <PAField>
              <template #label>排序（越大越靠前）</template>
              <PAInput v-model="groupFormOrderModel" type="number" :disabled="saving" />
            </PAField>
            <label class="checkbox">
              <input v-model="groupFormHiddenModel" type="checkbox" :disabled="saving" />
              <span>隐藏该大类（首页不显示）</span>
            </label>
          </div>
        </details>
      </div>

      <PAActions align="end">
        <PAButton
          :variant="selectedGroup.id === defaultGroupId ? 'ghost' : 'destructive'"
          :disabled="saving"
          @click="emit('reset-or-delete-group')"
        >
          {{ selectedGroup.id === defaultGroupId ? "重置" : "删除" }}
        </PAButton>
        <PAButton :disabled="saving" @click="emit('save-group')">保存</PAButton>
      </PAActions>

      <h3 class="admin-panel-title">新增二级分类</h3>
      <div class="form-grid">
        <PAField>
          <template #label>分类 ID（英文/数字）</template>
          <PAInput id="taxonomy-category-create-id" v-model="createCategoryIdModel" :disabled="saving" />
        </PAField>

        <PAField>
          <template #label>标题</template>
          <PAInput v-model="createCategoryTitleModel" :disabled="saving" />
        </PAField>

        <details class="subaccordion" :open="createCategoryHiddenModel || Number(createCategoryOrderModel || 0) !== 0">
          <summary>高级设置</summary>
          <div class="form-grid subaccordion-body">
            <PAField>
              <template #label>排序（越大越靠前）</template>
              <PAInput v-model="createCategoryOrderModel" type="number" :disabled="saving" />
            </PAField>
            <label class="checkbox">
              <input v-model="createCategoryHiddenModel" type="checkbox" :disabled="saving" />
              <span>隐藏该分类（首页不显示）</span>
            </label>
          </div>
        </details>
      </div>

      <PAActions align="end">
        <PAButton variant="ghost" :disabled="saving" @click="emit('reset-create-category')">重置</PAButton>
        <PAButton :disabled="saving" @click="emit('create-category')">创建</PAButton>
      </PAActions>
    </template>
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

.field-span {
  grid-column: 1 / -1;
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

.panel-divider {
  border-top: 1px dashed var(--border);
  margin-top: 2px;
}
</style>
