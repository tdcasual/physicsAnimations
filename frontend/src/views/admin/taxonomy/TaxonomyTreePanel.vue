<script setup lang="ts">
import { computed } from "vue";
import type { TaxonomyCategory, TaxonomySelection, TaxonomyTreeNode } from "../../../features/admin/taxonomyUiState";

const props = defineProps<{
  loading: boolean;
  searchQuery: string;
  showHidden: boolean;
  treeGroups: TaxonomyTreeNode[];
  selection: TaxonomySelection | null;
  taxonomyMetaText: string;
  isGroupOpen: (groupId: string) => boolean;
  groupMetaText: (node: { group: { categoryCount?: number; count?: number }; shownCategories: TaxonomyCategory[] }) => string;
  categoryMetaText: (category: TaxonomyCategory) => string;
}>();

const emit = defineEmits<{
  (event: "update:searchQuery", value: string): void;
  (event: "update:showHidden", value: boolean): void;
  (event: "collapse-all"): void;
  (event: "expand-all"): void;
  (event: "select-group", groupId: string): void;
  (event: "focus-create-category", groupId: string): void;
  (event: "select-category", categoryId: string): void;
  (event: "toggle-group", payload: { groupId: string; open: boolean }): void;
}>();

const searchModel = computed({
  get: () => props.searchQuery,
  set: (value: string) => emit("update:searchQuery", value),
});

const showHiddenModel = computed({
  get: () => props.showHidden,
  set: (value: boolean) => emit("update:showHidden", value),
});

function onToggle(groupId: string, event: Event) {
  const details = event.target as HTMLDetailsElement;
  emit("toggle-group", { groupId, open: details.open });
}
</script>

<template>
  <div class="panel admin-card">
    <h3>大类 / 分类列表</h3>

    <div class="toolbar">
      <input
        v-model="searchModel"
        class="field-input toolbar-search"
        type="search"
        placeholder="搜索大类或分类（标题 / ID）..."
        autocomplete="off"
      />
      <label class="checkbox toolbar-check">
        <input v-model="showHiddenModel" type="checkbox" />
        <span>显示隐藏项</span>
      </label>
      <div class="toolbar-actions">
        <button type="button" class="btn btn-ghost" @click="emit('collapse-all')">全部收起</button>
        <button type="button" class="btn btn-ghost" @click="emit('expand-all')">全部展开</button>
      </div>
    </div>

    <div class="meta-line">{{ taxonomyMetaText }}</div>

    <div v-if="loading" class="empty">加载中...</div>

    <div v-else-if="treeGroups.length === 0" class="empty">
      {{ searchQuery.trim() ? "未找到匹配的分类。" : "暂无大类。" }}
    </div>

    <div v-else class="tree-list">
      <details
        v-for="node in treeGroups"
        :key="node.group.id"
        class="group-block"
        :class="{ selected: selection?.kind === 'group' && selection.id === node.group.id }"
        :open="isGroupOpen(node.group.id)"
        @toggle="onToggle(node.group.id, $event)"
      >
        <summary class="group-summary" @click="emit('select-group', node.group.id)">
          <div class="group-main">
            <div class="group-title">
              {{ node.group.title || node.group.id }} ({{ node.group.id }})
              <span v-if="showHidden && node.group.hidden" class="tag">隐藏</span>
            </div>
            <div class="group-meta">{{ groupMetaText(node) }}</div>
          </div>
          <button type="button" class="btn btn-ghost btn-xs" @click.stop.prevent="emit('focus-create-category', node.group.id)">
            ＋ 二级分类
          </button>
        </summary>

        <div class="category-list">
          <button
            v-for="category in node.shownCategories"
            :key="category.id"
            type="button"
            class="category-item"
            :class="{ selected: selection?.kind === 'category' && selection.id === category.id }"
            @click="emit('select-category', category.id)"
          >
            <div class="category-title">
              {{ category.title || category.id }} ({{ category.id }})
              <span v-if="showHidden && category.hidden" class="tag">隐藏</span>
            </div>
            <div class="category-meta">{{ categoryMetaText(category) }}</div>
          </button>

          <div v-if="node.shownCategories.length === 0" class="empty-inline">
            {{ searchQuery.trim() ? "未找到匹配的二级分类。" : "暂无二级分类。" }}
          </div>
        </div>
      </details>
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

.toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto;
  gap: 10px;
  align-items: center;
}

@media (max-width: 960px) {
  .toolbar {
    grid-template-columns: 1fr;
  }
}

.toolbar-search {
  min-width: 0;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.toolbar-check {
  white-space: nowrap;
}

.meta-line {
  color: var(--muted);
  font-size: 12px;
}

.tree-list {
  display: grid;
  gap: 8px;
}

.group-block {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface) 94%, var(--bg));
}

.group-block.selected {
  border-color: color-mix(in srgb, var(--primary) 60%, var(--border));
}

.group-summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
}

.group-summary::-webkit-details-marker {
  display: none;
}

.group-main {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.group-title,
.category-title {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.group-meta,
.category-meta {
  font-size: 12px;
  color: var(--muted);
}

.category-list {
  display: grid;
  gap: 6px;
  padding: 0 10px 10px;
}

.category-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  display: grid;
  gap: 2px;
  text-align: left;
  background: var(--surface);
  color: inherit;
  cursor: pointer;
}

.category-item.selected {
  border-color: color-mix(in srgb, var(--primary) 60%, var(--border));
  background: color-mix(in srgb, var(--primary) 12%, var(--surface));
}

.tag {
  margin-left: 6px;
  display: inline-block;
  font-size: 11px;
  color: color-mix(in srgb, var(--danger) 70%, var(--text));
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}

.btn-xs {
  font-size: 12px;
  padding: 4px 8px;
}

.empty,
.empty-inline {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 12px;
  color: var(--muted);
  font-size: 13px;
}

.empty-inline {
  border-style: dotted;
  padding: 10px;
}
</style>
