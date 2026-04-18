<script setup lang="ts">
import type { AdminItemRow } from "../../../features/admin/adminApi";

import { PAButton, PAInput } from "@/components/ui/patterns";

const props = defineProps<{
  items: AdminItemRow[];
  editingId: string;
  loading: boolean;
  errorText: string;
  total: number;
  hasMore: boolean;
  query: string;
  previewHref: (item: AdminItemRow) => string;
  saving: boolean;
}>();

const emit = defineEmits<{
  "update:query": [value: string];
  "begin-edit": [item: AdminItemRow];
  "remove-item": [id: string];
  "load-more": [];
}>();
</script>

<template>
  <div class="list-divider" />

  <div class="list-header">
    <h3 class="list-heading">上传列表</h3>
    <PAInput
      :model-value="props.query"
      type="search"
      placeholder="搜索上传内容..."
      autocomplete="off"
      class="list-search"
      @update:model-value="emit('update:query', $event)"
    />
  </div>

  <div v-if="props.errorText" class="error-text">{{ props.errorText }}</div>
  <div v-if="props.items.length === 0 && !props.loading" class="empty">{{ props.query.trim() ? "未找到匹配的上传内容。" : "暂无上传内容。" }}</div>

  <article
    v-for="item in props.items"
    :key="item.id"
    class="item-card"
    :class="{ selected: props.editingId === item.id }"
  >
    <div class="item-head">
      <div>
        <div class="item-title break-anywhere">{{ item.title || item.id }}</div>
        <div class="item-meta break-anywhere">
          {{ item.categoryId }} · {{ item.type }} · {{ item.hidden ? "隐藏" : "可见" }} ·
          {{ item.published === false ? "草稿" : "已发布" }}
        </div>
      </div>
      <div class="item-actions">
        <PAButton as="a" variant="ghost" :href="props.previewHref(item)" target="_blank" rel="noreferrer">预览</PAButton>
        <PAButton variant="ghost" @click="emit('begin-edit', item)">
          {{ props.editingId === item.id ? "已选中" : "编辑" }}
        </PAButton>
        <PAButton variant="destructive" :disabled="props.saving" @click="emit('remove-item', item.id)">
          删除
        </PAButton>
      </div>
    </div>
  </article>

  <div class="list-footer">
    <div class="meta break-anywhere">已加载 {{ props.items.length }} / {{ props.total }}</div>
    <PAButton v-if="props.hasMore" variant="ghost" :disabled="props.loading" @click="emit('load-more')">
      加载更多
    </PAButton>
  </div>
</template>

<style scoped>
.list-divider {
  border-top: 1px dashed var(--border);
}
.list-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.list-search {
  width: min(360px, 100%);
}
.item-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 10px;
  background: color-mix(in srgb, var(--card) 90%, var(--background));
}
.item-card.selected {
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
  background: color-mix(in srgb, var(--primary) 9%, var(--card));
}
.item-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.item-title {
  font-weight: 600;
  word-break: break-word;
}
.item-meta {
  color: var(--foreground);
  font-size: calc(12px * var(--ui-scale));
  word-break: break-word;
}
.item-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.list-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.meta {
  color: var(--foreground);
  font-size: calc(12px * var(--ui-scale));
}

@media (max-width: 640px) {
  .list-header {
    gap: 6px;
  }
  .list-search {
    width: 100%;
  }
  .item-head {
    gap: 8px;
  }
  .item-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
  }
  .item-actions > * {
    min-width: 0;
  }
  .list-heading {
    display: none;
  }
}
</style>
