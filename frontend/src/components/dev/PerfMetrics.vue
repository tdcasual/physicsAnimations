<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

import { getCurrentMetrics } from "../../features/monitoring/webVitals";

interface MetricsDisplay {
  name: string;
  value: string;
  rating: "good" | "needs-improvement" | "poor" | "unknown";
}

const metrics = ref<MetricsDisplay[]>([]);
const isVisible = ref(false);

function updateMetrics() {
  const current = getCurrentMetrics();

  metrics.value = [
    {
      name: "TTFB",
      value: current.ttfb ? `${Math.round(current.ttfb)}ms` : "-",
      rating: getRating("ttfb", current.ttfb),
    },
    {
      name: "FCP",
      value: current.fcp ? `${Math.round(current.fcp)}ms` : "-",
      rating: getRating("fcp", current.fcp),
    },
  ];
}

function getRating(
  name: "ttfb" | "fcp",
  value?: number
): "good" | "needs-improvement" | "poor" | "unknown" {
  if (value === undefined) return "unknown";

  const thresholds = {
    ttfb: { good: 600, poor: 1800 },
    fcp: { good: 1800, poor: 3000 },
  };

  const t = thresholds[name];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

function getRatingClass(rating: string): string {
  const classes: Record<string, string> = {
    good: "bg-green-500",
    "needs-improvement": "bg-yellow-500",
    poor: "bg-red-500",
    unknown: "bg-gray-400",
  };
  return classes[rating] || "bg-gray-400";
}

let intervalId: number | null = null;

onMounted(() => {
  updateMetrics();
  // 每秒更新一次
  intervalId = window.setInterval(updateMetrics, 1000);
});

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
});
</script>

<template>
  <!-- 只在开发环境显示 -->
  <div v-if="isVisible" class="fixed bottom-4 right-4 z-50 rounded-lg bg-gray-900 p-4 text-white shadow-xl">
    <div class="mb-2 flex items-center justify-between">
      <h3 class="text-sm font-semibold">性能指标</h3>
      <button class="text-xs text-gray-400 hover:text-white" @click="isVisible = false">关闭</button>
    </div>
    <div class="space-y-2">
      <div v-for="m in metrics" :key="m.name" class="flex items-center gap-2">
        <span class="w-12 text-xs text-gray-400">{{ m.name }}</span>
        <span class="w-16 text-sm font-mono">{{ m.value }}</span>
        <span
          class="h-2 w-2 rounded-full"
          :class="getRatingClass(m.rating)"
          :title="m.rating"
        />
      </div>
    </div>
    <div class="mt-2 text-xs text-gray-500">
      完整指标请查看控制台
    </div>
  </div>

  <!-- 触发按钮 -->
  <button
    v-else
    class="fixed bottom-4 right-4 z-50 rounded-full bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg hover:bg-gray-800"
    @click="isVisible = true"
  >
    📊 Perf
  </button>
</template>
