<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { normalizePublicUrl } from "../features/catalog/catalogLink";
import {
  getLibraryFolder,
  listLibraryFolderAssets,
} from "../features/library/libraryApi";
import type { LibraryAsset, LibraryFolder } from "../features/library/types";

const route = useRoute();

const loading = ref(false);
const errorText = ref("");
const folder = ref<LibraryFolder | null>(null);
const assets = ref<LibraryAsset[]>([]);

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

async function reload() {
  const folderId = routeFolderId();
  if (!folderId) {
    errorText.value = "缺少文件夹参数。";
    folder.value = null;
    assets.value = [];
    return;
  }

  loading.value = true;
  errorText.value = "";
  try {
    const [nextFolder, nextAssets] = await Promise.all([
      getLibraryFolder(folderId),
      listLibraryFolderAssets(folderId),
    ]);
    folder.value = nextFolder;
    assets.value = nextAssets.assets;
    document.title = nextFolder.name ? `${nextFolder.name} - 资源库` : "资源库文件夹";
  } catch {
    errorText.value = "加载文件夹失败。";
    folder.value = null;
    assets.value = [];
  } finally {
    loading.value = false;
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
    <header class="library-head">
      <RouterLink to="/">← 返回目录</RouterLink>
      <h2>{{ folder?.name || "文件夹" }}</h2>
    </header>

    <div v-if="loading" class="library-state">正在加载文件夹...</div>
    <div v-else-if="errorText" class="library-state">{{ errorText }}</div>

    <div v-else class="library-assets">
      <article v-for="asset in assets" :key="asset.id" class="asset-card">
        <div class="asset-name">{{ asset.fileName || asset.id }}</div>
        <div class="asset-meta">
          {{ asset.adapterKey || "asset" }} · {{ asset.openMode === "embed" ? "容器页" : "下载" }}
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
            v-else
            class="btn btn-primary"
            :href="openAssetHref(asset)"
            download
          >
            下载文件
          </a>
          <a class="btn btn-ghost" :href="downloadAssetHref(asset)" download>下载源文件</a>
        </div>
      </article>

      <div v-if="assets.length === 0" class="library-state">该文件夹暂无资源。</div>
    </div>
  </section>
</template>

<style scoped>
.library-folder-view {
  display: grid;
  gap: 12px;
}

.library-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.library-head h2 {
  margin: 0;
}

.library-state {
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 18px;
  color: var(--muted);
}

.library-assets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.asset-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
  display: grid;
  gap: 8px;
}

.asset-name {
  font-weight: 600;
}

.asset-meta {
  color: var(--muted);
  font-size: 13px;
}

.asset-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
