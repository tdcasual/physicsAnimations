<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { normalizePublicUrl } from "../features/catalog/catalogLink";
import {
  getLibraryFolder,
  listLibraryFolderAssets,
} from "../features/library/libraryApi";
import type { LibraryAsset, LibraryFolder } from "../features/library/types";
import { resolveBackNavigationTarget } from "../features/navigation/backNavigation";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const errorText = ref("");
const folder = ref<LibraryFolder | null>(null);
const assets = ref<LibraryAsset[]>([]);
const pageHeading = ref("文件夹");
const reloadSeq = ref(0);

const folderSummary = computed(() => {
  if (!folder.value) return "从这里进入完整素材、容器页和下载文件，适合做课堂准备或课后归档。";
  return `${folder.value.categoryId || "未分类"} · ${folder.value.assetCount || assets.value.length || 0} 项资源归档`;
});

const folderCoverUrl = computed(() => {
  if (!folder.value?.coverPath) return "";
  return normalizePublicUrl(folder.value.coverPath);
});

const libraryFolderCount = computed(() => `${folder.value?.assetCount || assets.value.length || 0} 项归档`);

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

function assetKicker(asset: LibraryAsset): string {
  return asset.adapterKey || "asset";
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
        <button type="button" class="btn btn-ghost" @click="goBack">← 返回目录</button>
        <span class="library-folder-count">{{ libraryFolderCount }}</span>
      </div>
      <div class="library-folder-hero-body">
        <div class="library-folder-copy">
          <p class="library-folder-kicker">资源档案</p>
          <h2>{{ pageHeading }}</h2>
          <p class="library-folder-summary">{{ folderSummary }}</p>
          <div class="library-folder-shortcuts">
            <RouterLink class="btn btn-ghost" :to="{ path: '/', hash: '#catalog-recent' }">回到最近课堂入口</RouterLink>
            <RouterLink class="btn btn-ghost" :to="{ path: '/', hash: '#catalog-favorites' }">查看已固定演示</RouterLink>
          </div>
        </div>
        <div class="library-folder-cover" :class="{ 'is-empty': !folderCoverUrl }">
          <img v-if="folderCoverUrl" :src="folderCoverUrl" alt="" loading="lazy" />
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
        <div class="asset-kicker">{{ assetKicker(asset) }}</div>
        <div class="asset-headline">
          <div class="asset-name">{{ asset.displayName || asset.fileName || asset.id }}</div>
          <div class="asset-state-badge" :class="asset.openMode === 'embed' ? 'is-embed' : 'is-download'">
            {{ assetModeLabel(asset) }}
          </div>
        </div>
        <div class="asset-meta">
          {{ asset.adapterKey || "asset" }} · {{ asset.openMode === "embed" ? "演示" : "仅下载" }}
        </div>
        <div class="asset-actions">
          <a
            v-if="asset.openMode === 'embed'"
            class="btn btn-primary"
            :href="openAssetHref(asset)"
            target="_blank"
            rel="noreferrer"
          >
            打开演示
          </a>
          <a
            v-if="asset.openMode === 'embed'"
            class="btn btn-ghost"
            :href="downloadAssetHref(asset)"
            download
          >
            下载源文件
          </a>
          <a v-else class="btn btn-primary" :href="downloadAssetHref(asset)" download>下载文件</a>
        </div>
      </article>

      <div v-if="assets.length === 0" class="library-state">该文件夹暂无资源。</div>
    </div>
  </section>
</template>

<style scoped>
.library-folder-view {
  display: grid;
  gap: 14px;
}

.library-folder-hero {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid color-mix(in oklab, var(--line-strong) 18%, var(--border));
  border-radius: 20px;
  background:
    linear-gradient(135deg, color-mix(in oklab, var(--accent-copper) 8%, var(--surface)), color-mix(in oklab, var(--surface) 94%, var(--paper))),
    var(--surface);
  box-shadow: 0 24px 52px -38px color-mix(in oklab, var(--ink) 26%, transparent);
}

.library-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: space-between;
}

.library-folder-count {
  padding: 8px 12px;
  border: 1px solid color-mix(in oklab, var(--line-strong) 18%, var(--border));
  border-radius: 999px;
  color: color-mix(in oklab, var(--accent-copper-strong) 72%, var(--text));
  font-size: calc(12px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: color-mix(in oklab, var(--surface) 86%, var(--paper));
}

.library-folder-hero-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 240px);
  gap: 18px;
  align-items: start;
}

.library-folder-copy {
  display: grid;
  gap: 8px;
}

.library-folder-kicker,
.asset-kicker {
  margin: 0;
  color: color-mix(in oklab, var(--accent-copper-strong) 72%, var(--text));
  font-size: calc(12px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.library-head h2 {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-family: "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", serif;
  font-size: clamp(1.5rem, 1.1rem + 0.8vw, 2.15rem);
  line-height: 1.06;
}

.library-folder-summary {
  margin: 0;
  color: var(--muted);
  max-width: 52ch;
}

.library-folder-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.library-folder-cover {
  aspect-ratio: 4 / 3;
  border: 1px solid color-mix(in oklab, var(--line-strong) 16%, var(--border));
  border-radius: 18px;
  overflow: hidden;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--surface) 88%, var(--paper)), color-mix(in oklab, var(--accent) 10%, var(--surface)));
}

.library-folder-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.library-folder-cover.is-empty {
  display: grid;
  place-items: center;
}

.library-folder-cover-placeholder {
  color: color-mix(in oklab, var(--accent) 70%, var(--text));
  font-size: calc(14px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.library-state {
  border: 1px dashed color-mix(in oklab, var(--line-strong) 18%, var(--border));
  border-radius: 14px;
  padding: 18px;
  color: var(--muted);
  background: color-mix(in oklab, var(--surface) 86%, var(--paper));
}

.library-assets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--library-card-min-width, 240px), 1fr));
  gap: 14px;
}

.asset-card {
  border: 1px solid color-mix(in oklab, var(--line-strong) 16%, var(--border));
  border-radius: 18px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--surface) 96%, var(--paper)), color-mix(in oklab, var(--surface-raised) 84%, var(--paper)));
  padding: 14px;
  display: grid;
  gap: 8px;
  box-shadow: 0 18px 36px -32px color-mix(in oklab, var(--ink) 24%, transparent);
}

.asset-card--embed {
  border-color: color-mix(in oklab, var(--accent) 28%, var(--border));
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--accent) 10%, var(--surface)), color-mix(in oklab, var(--surface-raised) 84%, var(--paper)));
}

.asset-card--download {
  border-style: dashed;
  border-color: color-mix(in oklab, var(--accent-copper) 32%, var(--border));
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--accent-copper) 10%, var(--surface)), color-mix(in oklab, var(--surface-raised) 84%, var(--paper)));
}

.asset-headline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.asset-name {
  font-weight: 700;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-size: calc(16px * var(--ui-scale, 1));
  line-height: 1.2;
}

.asset-state-badge {
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--line-strong) 16%, var(--border));
  font-size: calc(11px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.asset-state-badge.is-embed {
  color: color-mix(in oklab, var(--accent) 82%, var(--text));
  background: color-mix(in oklab, var(--accent) 14%, var(--surface));
  border-color: color-mix(in oklab, var(--accent) 34%, var(--border));
}

.asset-state-badge.is-download {
  color: color-mix(in oklab, var(--accent-copper-strong) 82%, var(--text));
  background: color-mix(in oklab, var(--accent-copper) 16%, var(--surface));
  border-color: color-mix(in oklab, var(--accent-copper) 34%, var(--border));
}

.asset-meta {
  color: var(--muted);
  overflow-wrap: anywhere;
  word-break: break-word;
  font-size: calc(13px * var(--ui-scale, 1));
}

.asset-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .library-folder-hero {
    padding: 14px;
  }

  .library-folder-hero-body {
    grid-template-columns: 1fr;
  }

  .asset-headline {
    flex-direction: column;
  }
}
</style>
