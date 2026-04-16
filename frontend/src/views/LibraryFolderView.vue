<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { normalizePublicUrl } from "../features/catalog/catalogLink";
import {
  getLibraryFolder,
  listLibraryFolderAssets,
} from "../features/library/libraryApi";
import type { LibraryAsset, LibraryFolder } from "../features/library/types";
import { resolveBackNavigationTarget } from "../features/navigation/backNavigation";
import { PAButton } from "@/components/ui/patterns";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const errorText = ref("");
const folder = ref<LibraryFolder | null>(null);
const assets = ref<LibraryAsset[]>([]);
const pageHeading = ref("文件夹");
const reloadSeq = ref(0);

const folderSummary = computed(() => {
  if (!folder.value) return "浏览文件夹内的资源与下载。";
  return `${folder.value.categoryId || "未分类"} · ${folder.value.assetCount || assets.value.length || 0} 项资源归档`;
});

const folderCoverUrl = computed(() => {
  if (!folder.value?.coverPath) return "";
  return normalizePublicUrl(folder.value.coverPath);
});

function routeFolderId(): string {
  return String(route.params.id || "").trim();
}

function openAssetHref(asset: LibraryAsset): string {
  if (asset.openMode === "embed" && asset.generatedEntryPath) {
    return normalizePublicUrl(asset.generatedEntryPath);
  }
  return normalizePublicUrl(asset.filePath);
}

function downloadAssetHref(asset: LibraryAsset): string {
  return normalizePublicUrl(asset.filePath);
}

function assetModeLabel(asset: LibraryAsset): string {
  return asset.openMode === "embed" ? "可直接演示" : "仅下载";
}

function goBack() {
  const target = resolveBackNavigationTarget({
    historyState: window.history.state,
    fallbackHash: "#catalog-library",
  });

  if (target.mode === "history-back") {
    router.back();
    return;
  }
  if (target.hash === "#catalog-library") {
    void router.replace({ path: "/", hash: "#catalog-library" });
    return;
  }
  void router.replace({ path: target.path, hash: target.hash });
}

async function reload() {
  const requestSeq = reloadSeq.value + 1;
  reloadSeq.value = requestSeq;
  const folderId = routeFolderId();
  if (!folderId) {
    document.title = "缺少文件夹参数 - 资源库";
    pageHeading.value = "缺少文件夹参数";
    errorText.value = "缺少文件夹参数。";
    folder.value = null;
    assets.value = [];
    loading.value = false;
    return;
  }

  loading.value = true;
  errorText.value = "";
  pageHeading.value = "文件夹";
  try {
    const nextFolder = await getLibraryFolder(folderId);
    const nextAssets = await listLibraryFolderAssets(folderId);
    if (requestSeq !== reloadSeq.value || routeFolderId() !== folderId) return;
    folder.value = nextFolder;
    assets.value = nextAssets.assets;
    pageHeading.value = nextFolder.name || "文件夹";
    document.title = nextFolder.name ? `${nextFolder.name} - 资源库` : "资源库文件夹";
  } catch {
    if (requestSeq !== reloadSeq.value || routeFolderId() !== folderId) return;
    document.title = "加载文件夹失败 - 资源库";
    pageHeading.value = "加载文件夹失败";
    errorText.value = "加载文件夹失败。";
    folder.value = null;
    assets.value = [];
  } finally {
    if (requestSeq === reloadSeq.value) {
      loading.value = false;
    }
  }
}

onMounted(() => {
  void reload();
});

watch(
  () => route.fullPath,
  () => {
    void reload();
  },
);
</script>

<template>
  <section class="library-folder-view">
    <header class="library-folder-hero">
      <div class="library-head">
        <PAButton variant="ghost" @click="goBack">← 返回目录</PAButton>
      </div>
      <div class="library-folder-hero-body">
        <div class="library-folder-copy">
          <h2 class="break-anywhere">{{ pageHeading }}</h2>
          <p class="library-folder-summary">{{ folderSummary }}</p>
        </div>
        <div class="library-folder-cover" :class="{ 'is-empty': !folderCoverUrl }">
          <img v-if="folderCoverUrl" :src="folderCoverUrl" :alt="pageHeading" loading="lazy" />
          <div v-else class="library-folder-cover-placeholder">Archive</div>
        </div>
      </div>
    </header>

    <div v-if="loading" class="library-state">正在加载文件夹...</div>
    <div v-else-if="errorText" class="library-state">{{ errorText }}</div>

    <div v-else class="library-assets">
      <article
        v-for="asset in assets"
        :key="asset.id"
        class="asset-card"
        :class="asset.openMode === 'embed' ? 'asset-card--embed' : 'asset-card--download'"
      >
        <div class="asset-headline">
          <div class="asset-name break-anywhere">{{ asset.displayName || asset.fileName || asset.id }}</div>
          <div class="asset-state-badge" :class="asset.openMode === 'embed' ? 'is-embed' : 'is-download'">
            {{ assetModeLabel(asset) }}
          </div>
        </div>
        <div class="asset-actions">
          <PAButton
            v-if="asset.openMode === 'embed'"
            as="a"
            :href="openAssetHref(asset)"
            target="_blank"
            rel="noreferrer"
          >
            打开演示
          </PAButton>
          <PAButton
            v-if="asset.openMode === 'embed'"
            as="a"
            variant="ghost"
            :href="downloadAssetHref(asset)"
          >
            下载源文件
          </PAButton>
          <PAButton v-else as="a" :href="downloadAssetHref(asset)">下载文件</PAButton>
        </div>
      </article>

      <div v-if="assets.length === 0" class="library-state">该文件夹暂无资源。</div>
    </div>
  </section>
</template>

<style scoped src="./LibraryFolderView.css"></style>
