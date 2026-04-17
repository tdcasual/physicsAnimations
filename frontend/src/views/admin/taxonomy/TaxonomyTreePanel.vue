<script setup lang="ts">
import { computed } from "vue";
import type { TaxonomyCategory, TaxonomyGroup, TaxonomySelection, TaxonomyTreeNode } from "../../../features/admin/taxonomyUiState";
import { PAButton, PACard, PAInput } from "@/components/ui/patterns";

const props = defineProps<{
  loading: boolean;
  searchQuery: string;
  showHidden: boolean;
  treeGroups: TaxonomyTreeNode[];
  selection: TaxonomySelection | null;
  taxonomyMetaText: string;
  isGroupOpen: (groupId: string) => boolean;
  groupMetaText: (node: { group: TaxonomyGroup; shownCategories: TaxonomyCategory[] }) => string;
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

const groupMetaMap = computed(() => {
  const map = new Map<string, string>();
  for (const node of props.treeGroups) {
    map.set(node.group.id, props.groupMetaText(node));
  }
  return map;
});

const categoryMetaMap = computed(() => {
  const map = new Map<string, string>();
  for (const node of props.treeGroups) {
    for (const category of node.shownCategories) {
      map.set(category.id, props.categoryMetaText(category));
    }
  }
  return map;
});
</script>

<template>
  <PACard variant="admin" class="panel p-3">
    <h3 class="admin-panel-title">大类 / 分类列表</h3>

    <div class="toolbar">
      <PAInput
        v-model="searchModel"
        type="search"
        placeholder="搜索大类或分类（标题 / ID）..."
        autocomplete="off"
        class="toolbar-search"
      />
      <div class="tree-mobile-toolbar">
        <label class="checkbox toolbar-check">
          <input v-model="showHiddenModel" type="checkbox" />
          <span>显示隐藏项</span>
        </label>
        <div class="toolbar-actions">
          <PAButton variant="ghost" size="sm" @click="emit('collapse-all')">全部收起</PAButton>
          <PAButton variant="ghost" size="sm" @click="emit('expand-all')">全部展开</PAButton>
        </div>
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
            <div class="group-title break-anywhere">
              {{ node.group.title || node.group.id }} ({{ node.group.id }})
              <span v-if="showHidden && node.group.hidden" class="tag">隐藏</span>
            </div>
            <div class="group-meta">{{ groupMetaMap.get(node.group.id) }}</div>
          </div>
          <PAButton variant="ghost" size="sm" class="compact-btn" @click.stop.prevent="emit('focus-create-category', node.group.id)">
            ＋ 二级分类
          </PAButton>
        </summary>

        <div class="category-list">
          <button
            v-for="category in node.shownCategories"
            :key="category.id"
            type="button"
            class="category-item"
            :class="{ selected: selection?.kind === 'category' && selection.id === category.id }"
            :aria-pressed="selection?.kind === 'category' && selection.id === category.id"
            @click="emit('select-category', category.id)"
          >
            <div class="category-title break-anywhere">
              {{ category.title || category.id }} ({{ category.id }})
              <span v-if="showHidden && category.hidden" class="tag">隐藏</span>
            </div>
            <div class="category-meta">{{ categoryMetaMap.get(category.id) }}</div>
          </button>

          <div v-if="node.shownCategories.length === 0" class="empty-inline">
            {{ searchQuery.trim() ? "未找到匹配的二级分类。" : "暂无二级分类。" }}
          </div>
        </div>
      </details>
    </div>
  </PACard>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 10px;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.tree-mobile-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 960px) {
  .toolbar {
    grid-template-columns: 1fr;
  }

  .tree-mobile-toolbar {
    justify-content: flex-start;
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

.tree-list {
  display: grid;
  gap: 8px;
}

.group-block {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--card) 94%, var(--background));
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
  font-size: calc(14px * var(--ui-scale));
  font-weight: 600;
  word-break: break-word;
}

.group-meta,
.category-meta {
  font-size: calc(12px * var(--ui-scale));
  color: var(--foreground);
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
  background: var(--card);
  color: inherit;
  cursor: pointer;
}

.category-item.selected {
  border-color: color-mix(in srgb, var(--primary) 60%, var(--border));
  background: color-mix(in srgb, var(--primary) 12%, var(--card));
}

.tag {
  margin-left: 6px;
  display: inline-block;
  font-size: calc(11px * var(--ui-scale));
  color: color-mix(in srgb, var(--destructive) 70%, var(--foreground));
}

.compact-btn {
  font-size: calc(12px * var(--ui-scale));
  padding: 4px 8px;
}

.empty,
.empty-inline {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 12px;
  color: var(--foreground);
  font-size: calc(13px * var(--ui-scale));
}

.empty-inline {
  border-style: dotted;
  padding: 10px;
}

@media (max-width: 640px) {
  .tree-mobile-toolbar {
    display: grid;
    gap: 8px;
  }

  .toolbar-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .group-summary {
    align-items: flex-start;
  }

  .group-summary .compact-btn {
    min-height: 40px;
    padding-inline: 10px;
  }

  .category-item {
    padding: 10px;
  }
}
</style>
