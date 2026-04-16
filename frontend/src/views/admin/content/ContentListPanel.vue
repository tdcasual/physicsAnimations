<script setup lang="ts">
import type { AdminItemRow } from "../../../features/admin/adminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ExternalLink, Pencil, Trash2, Search, Loader2 } from "lucide-vue-next";

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

function getStatusBadge(item: AdminItemRow) {
  if (item.hidden) return { label: "隐藏", variant: "secondary" as const };
  if (item.published === false) return { label: "草稿", variant: "outline" as const };
  return { label: "已发布", variant: "default" as const };
}
</script>

<template>
  <div class="space-y-4">
    <!-- List Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h3 class="text-lg font-semibold">内容列表</h3>
      <div class="relative max-w-sm">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          :value="props.query"
          type="search"
          placeholder="搜索内容..."
          class="pl-9 rounded-full"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <!-- Error Alert -->
    <div 
      v-if="props.errorText" 
      class="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {{ props.errorText }}
    </div>

    <!-- Empty State -->
    <div 
      v-if="props.items.length === 0 && !props.loading" 
      class="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 py-12 text-center"
    >
      <p class="text-muted-foreground">
        {{ props.query.trim() ? "未找到匹配内容。" : "暂无内容。" }}
      </p>
    </div>

    <!-- Loading State -->
    <div v-else-if="props.loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-24 rounded-2xl bg-muted animate-pulse" />
    </div>

    <!-- Items List -->
    <div v-else class="space-y-3">
      <Card
        v-for="item in props.items"
        :key="item.id"
        class="group transition-all duration-200 hover:shadow-md"
        :class="[
          'rounded-2xl border',
          props.editingId === item.id 
            ? 'border-primary bg-primary/5 shadow-sm' 
            : 'border-border bg-card'
        ]"
      >
        <CardContent class="p-4">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <!-- Item Info -->
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-semibold truncate">
                  {{ item.title || item.id }}
                </h4>
                <Badge 
                  :variant="getStatusBadge(item).variant"
                  class="text-xs"
                >
                  {{ getStatusBadge(item).label }}
                </Badge>
              </div>
              <div class="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <span class="truncate">{{ item.categoryId }}</span>
                <span class="text-border">·</span>
                <Badge variant="secondary" class="text-xs font-normal">
                  {{ item.type }}
                </Badge>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                as-child
                class="h-8 w-8 p-0 rounded-full"
              >
                <a :href="props.previewHref(item)" target="_blank" rel="noreferrer" aria-label="在新窗口预览">
                  <ExternalLink class="h-4 w-4" />
                </a>
              </Button>
              
              <Button
                :variant="props.editingId === item.id ? 'default' : 'outline'"
                size="sm"
                class="h-8 gap-1.5 rounded-full"
                @click="emit('begin-edit', item)"
              >
                <Pencil class="h-3.5 w-3.5" />
                {{ props.editingId === item.id ? "编辑中" : "编辑" }}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                :disabled="props.saving"
                aria-label="删除"
                class="h-8 w-8 p-0 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                @click="emit('remove-item', item.id)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- List Footer -->
    <div class="flex items-center justify-between pt-2">
      <p class="text-sm text-muted-foreground">
        已加载 {{ props.items.length }} / {{ props.total }}
      </p>
      <Button
        v-if="props.hasMore"
        variant="outline"
        size="sm"
        :disabled="props.loading"
        class="rounded-full gap-2"
        @click="emit('load-more')"
      >
        <Loader2 v-if="props.loading" class="h-4 w-4 animate-spin" />
        加载更多
      </Button>
    </div>
  </div>
</template>
