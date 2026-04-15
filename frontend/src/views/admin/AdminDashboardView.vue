<script setup lang="ts">
import { onMounted, ref } from "vue";
import { fetchDashboardStats, type DashboardStats } from "@/features/admin/adminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Upload, 
  Database, 
  Link2, 
  Tags, 
  LayoutGrid,
  RefreshCw,
  FolderOpen,
  Settings,
  ArrowRight,
  Sparkles
} from "lucide-vue-next";

const loading = ref(false);
const errorText = ref("");
const reloadSeq = ref(0);
const stats = ref<DashboardStats>({
  dynamicTotal: 0,
  uploadTotal: 0,
  linkTotal: 0,
  categoryTotal: 0,
  total: 0,
});

async function reload() {
  const requestSeq = reloadSeq.value + 1;
  reloadSeq.value = requestSeq;
  loading.value = true;
  errorText.value = "";
  try {
    const nextStats = await fetchDashboardStats();
    if (requestSeq !== reloadSeq.value) return;
    stats.value = nextStats;
  } catch (err) {
    if (requestSeq !== reloadSeq.value) return;
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "加载统计失败。";
  } finally {
    if (requestSeq === reloadSeq.value) {
      loading.value = false;
    }
  }
}

onMounted(async () => {
  await reload();
});

const quickActions = [
  {
    title: "上传素材",
    description: "添加新的演示动画或资源文件",
    icon: Upload,
    to: "/admin/uploads",
    variant: "default" as const,
  },
  {
    title: "整理内容",
    description: "管理现有演示的分类和元数据",
    icon: Database,
    to: "/admin/content",
    variant: "outline" as const,
  },
  {
    title: "资源库",
    description: "检查文件夹结构和资产状态",
    icon: FolderOpen,
    to: "/admin/library",
    variant: "outline" as const,
  },
  {
    title: "分类管理",
    description: "维护学科分类和标签体系",
    icon: Tags,
    to: "/admin/taxonomy",
    variant: "outline" as const,
  },
  {
    title: "系统设置",
    description: "配置站点参数和维护任务",
    icon: Settings,
    to: "/admin/system",
    variant: "outline" as const,
  },
];

const statCards = [
  {
    title: "全部内容",
    value: () => stats.value.total,
    description: "公开演示总数",
    color: "foreground",
    gradient: "from-gray-200 to-gray-50",
  },
  {
    title: "上传内容",
    value: () => stats.value.uploadTotal,
    description: "站内托管资源",
    color: "foreground",
    gradient: "from-gray-200 to-gray-50",
  },
  {
    title: "外链内容",
    value: () => stats.value.linkTotal,
    description: "外部链接资源",
    color: "foreground",
    gradient: "from-gray-200 to-gray-50",
  },
  {
    title: "分类节点",
    value: () => stats.value.categoryTotal,
    description: "二级分类数量",
    color: "foreground",
    gradient: "from-gray-200 to-gray-50",
  },
];
</script>

<template>
  <div class="space-y-8 p-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles class="h-4 w-4 text-primary" />
          </div>
          <h1 class="text-2xl font-bold tracking-tight">管理后台</h1>
        </div>
        <p class="text-sm text-muted-foreground">
          管理演示内容、资源库和系统配置
        </p>
      </div>
      <Button variant="outline" size="sm" :disabled="loading" @click="reload" class="gap-2">
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        {{ loading ? '刷新中...' : '刷新数据' }}
      </Button>
    </div>

    <!-- Error Alert -->
    <div 
      v-if="errorText" 
      class="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {{ errorText }}
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Skeleton v-for="i in 4" :key="i" class="h-32 rounded-2xl" />
    </div>

    <template v-else>
      <!-- Stats Grid -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card 
          v-for="stat in statCards" 
          :key="stat.title"
          class="group relative overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          <!-- Gradient Background -->
          <div 
            class="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-gradient-to-br opacity-60 blur-2xl transition-opacity group-hover:opacity-80"
            :class="stat.gradient"
          />
          <CardHeader class="relative pb-2">
            <CardDescription class="text-xs font-medium uppercase tracking-wider">
              {{ stat.title }}
            </CardDescription>
            <CardTitle class="text-3xl font-bold" :class="stat.color === 'primary' ? 'text-primary' : stat.color === 'secondary' ? 'text-secondary' : 'text-accent'">
              {{ stat.value() }}
            </CardTitle>
          </CardHeader>
          <CardContent class="relative">
            <p class="text-xs text-muted-foreground">{{ stat.description }}</p>
          </CardContent>
        </Card>
      </div>

      <!-- Quick Actions -->
      <div class="space-y-4">
        <h2 class="text-lg font-semibold">快速操作</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card 
            v-for="action in quickActions" 
            :key="action.to"
            class="group cursor-pointer rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <CardHeader class="pb-3">
              <div class="flex items-start justify-between">
                <div 
                  class="flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"
                >
                  <component :is="action.icon" class="h-5 w-5" />
                </div>
                <ArrowRight class="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
              </div>
              <CardTitle class="text-base font-semibold">
                <RouterLink :to="action.to" class="hover:text-primary transition-colors">
                  {{ action.title }}
                </RouterLink>
              </CardTitle>
              <CardDescription class="text-xs leading-relaxed">
                {{ action.description }}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      <!-- Tips Section -->
      <Card class="rounded-2xl border border-dashed bg-muted/30">
        <CardHeader>
          <div class="flex items-center gap-2">
            <LayoutGrid class="h-4 w-4 text-muted-foreground" />
            <CardTitle class="text-sm font-medium">使用提示</CardTitle>
          </div>
        </CardHeader>
        <CardContent class="text-sm text-muted-foreground">
          <ul class="list-inside list-disc space-y-2">
            <li>定期上传新的演示动画以丰富内容库</li>
            <li>使用分类管理维护清晰的学科结构</li>
            <li>检查资源库确保所有文件可正常访问</li>
          </ul>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
