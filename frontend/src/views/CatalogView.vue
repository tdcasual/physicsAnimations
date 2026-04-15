<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useCatalogViewState } from "@/features/catalog/useCatalogViewState";
import { useCatalogTheme } from "@/features/catalog/theme";
import { Skeleton } from "@/components/ui/skeleton";
import type { gsap as GSAPType, ScrollTrigger as ScrollTriggerType } from "@/lib/gsap";

import HeroSection from "./catalog/components/HeroSection.vue";
import FilterTabs from "./catalog/components/FilterTabs.vue";
import DemoCard from "./catalog/components/DemoCard.vue";
import FolderCard from "./catalog/components/FolderCard.vue";
import CatalogThemeSwitcher from "@/components/catalog/CatalogThemeSwitcher.vue";

const {
  loading,
  loadError,
  view,
  filteredLibraryFolders,
  selectGroup,
  selectCategory,
  getItemHref,
} = useCatalogViewState();

// 主题系统
const { currentTheme, initTheme } = useCatalogTheme();

const gridRef = ref<HTMLElement | null>(null);
const hasAnimated = ref(false);
let animationTimeoutId: number | null = null;

function getFolderHref(folderId: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/+$/, "/")}library/folder/${encodeURIComponent(folderId)}`;
}

async function animateGrid() {
  if (!gridRef.value) return;
  const cards = gridRef.value.querySelectorAll(".gallery-card");
  if (cards.length === 0) return;

  const { initGsap } = await import("@/lib/gsap");
  const { gsap, ScrollTrigger } = await initGsap();

  gsap.fromTo(
    cards,
    { y: 60, opacity: 0, scale: 0.95 },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.6,
      stagger: 0.08,
      ease: "power3.out",
      scrollTrigger: {
        trigger: gridRef.value,
        start: "top 85%",
        once: true,
      } as ScrollTriggerType.Vars,
    }
  );
}

// Re-animate when content changes
watch(
  () => [view.value.activeGroupId, view.value.activeCategoryId, loading.value],
  async ([, , isLoading]) => {
    if (isLoading) return;
    hasAnimated.value = false;
    await nextTick();
    animationTimeoutId = window.setTimeout(() => {
      if (!hasAnimated.value) {
        animateGrid();
        hasAnimated.value = true;
      }
    }, 50);
  },
  { immediate: true }
);

onUnmounted(() => {
  if (animationTimeoutId !== null) {
    clearTimeout(animationTimeoutId);
  }
});

onMounted(() => {
  // 初始化主题
  initTheme();
  
  if (!loading.value && !hasAnimated.value) {
    animateGrid();
    hasAnimated.value = true;
  }
});

const showEmptyState = computed(() => {
  return !loading.value && view.value.items.length === 0 && filteredLibraryFolders.value.length === 0;
});

const emptyMessage = computed(() => {
  if (view.value.hasAnyItems) return "没有匹配的作品。";
  return "未找到任何作品。";
});

// Calculate total items for display
const totalItems = computed(() => {
  return view.value.items.length + filteredLibraryFolders.value.length;
});

// Optimize category title lookup
const activeCategoryTitle = computed(() => {
  return view.value.categories.find(c => c.id === view.activeCategoryId)?.title || '全部演示';
});
</script>

<template>
  <section class="min-h-screen pb-24 cat-transition-theme" :data-catalog-theme="currentTheme">
    <!-- Theme Switcher - Fixed position, bottom-left on mobile to avoid overlap -->
    <div class="fixed bottom-20 left-4 z-50 sm:top-24 sm:right-6 sm:bottom-auto sm:left-auto md:top-24 md:right-6">
      <CatalogThemeSwitcher />
    </div>
    
    <!-- Hero -->
    <HeroSection />

    <!-- Filters - Sticky with subtle transition -->
    <div class="sticky top-16 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div class="px-4 py-3 sm:px-6 lg:px-8">
        <FilterTabs
          :groups="view.groups"
          :categories="view.categories"
          :active-group-id="view.activeGroupId"
          :active-category-id="view.activeCategoryId"
          @select-group="selectGroup"
          @select-category="selectCategory"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="px-4 pt-12 sm:px-6 lg:px-8">
      <!-- Section Header - Clean gallery style -->
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-lg font-normal text-gray-900">
          {{ activeCategoryTitle }}
        </h2>
        <span class="text-xs font-light tracking-wide text-gray-400">
          {{ totalItems }} 件作品
        </span>
      </div>

      <!-- Loading Skeletons - Compact gallery style -->
      <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <div v-for="i in 8" :key="i" class="flex flex-col gap-2">
          <Skeleton class="aspect-[3/2] bg-gray-100" />
          <Skeleton class="h-4 w-2/3 bg-gray-100" />
          <Skeleton class="h-3 w-1/3 bg-gray-100" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="loadError" class="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <p class="text-lg text-muted-foreground">{{ loadError }}</p>
      </div>

      <!-- Gallery Grid - Compact gallery style -->
      <template v-else>
        <!-- Folders Section -->
        <div
          v-if="filteredLibraryFolders.length > 0"
          class="mb-12"
        >
          <h3 class="mb-4 text-xs font-normal uppercase tracking-[0.15em] text-gray-400">
            资源库精选
          </h3>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <FolderCard
              v-for="(folder, idx) in filteredLibraryFolders"
              :key="`folder-${folder.id}`"
              class="gallery-card"
              :id="folder.id"
              :name="folder.name"
              :cover-path="folder.coverPath"
              :href="getFolderHref(folder.id)"
              tag="资源库"
              :index="idx"
            />
          </div>
        </div>

        <!-- Demo Items Section -->
        <div>
          <h3 v-if="filteredLibraryFolders.length > 0" class="mb-4 text-xs font-normal uppercase tracking-[0.15em] text-gray-400">
            演示动画
          </h3>
          <div
            ref="gridRef"
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          >
            <DemoCard
              v-for="(item, idx) in view.items"
              :key="item.id"
              class="gallery-card"
              :id="item.id"
              :title="item.title"
              :description="item.description"
              :thumbnail="item.thumbnail"
              :href="getItemHref(item)"
              :tag="view.categories.find((c) => c.id === item.categoryId)?.title"
              :index="idx"
              @tag-click="selectCategory"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="showEmptyState" class="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
          <div class="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <span class="text-3xl text-muted-foreground">?</span>
          </div>
          <p class="text-muted-foreground">{{ emptyMessage }}</p>
        </div>
      </template>
    </div>
  </section>
</template>
