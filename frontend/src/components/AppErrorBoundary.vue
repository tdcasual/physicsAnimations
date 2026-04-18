<script setup lang="ts">
import { Button } from "@/components/ui/button";

const props = defineProps<{
  error: Error | null;
}>();

const emit = defineEmits<{
  (e: "clear"): void;
  (e: "reload"): void;
}>();
</script>

<template>
  <div v-if="props.error" class="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center px-4">
    <p class="text-destructive text-lg font-medium">页面出现了一些问题</p>
    <p class="text-muted-foreground text-sm">{{ props.error.message || "未知错误" }}</p>
    <div class="flex gap-2">
      <Button variant="outline" @click="emit('reload')">刷新页面</Button>
      <Button as-child>
        <RouterLink to="/" @click="emit('clear')">返回首页</RouterLink>
      </Button>
    </div>
  </div>
  <slot v-else />
</template>
