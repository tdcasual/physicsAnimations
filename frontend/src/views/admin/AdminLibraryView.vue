<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  createLibraryFolder,
  deleteLibraryAsset,
  deleteLibraryFolder,
  getLibraryFolder,
  listLibraryFolderAssets,
  listLibraryFolders,
  uploadLibraryAsset,
  uploadLibraryFolderCover,
} from "../../features/library/libraryApi";
import type { LibraryAsset, LibraryFolder, LibraryOpenMode } from "../../features/library/types";

const loading = ref(false);
const saving = ref(false);
const feedback = ref("");
const feedbackError = ref(false);

const folders = ref<LibraryFolder[]>([]);
const selectedFolderId = ref("");
const folderAssets = ref<LibraryAsset[]>([]);

const folderName = ref("");
const folderCategoryId = ref("other");

const coverFile = ref<File | null>(null);
const assetFile = ref<File | null>(null);
const openMode = ref<LibraryOpenMode>("embed");

const selectedFolder = computed(() => folders.value.find((folder) => folder.id === selectedFolderId.value) || null);

function setFeedback(text: string, isError = false) {
  feedback.value = text;
  feedbackError.value = isError;
}

function onCoverFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  coverFile.value = target.files?.[0] || null;
}

function onAssetFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  assetFile.value = target.files?.[0] || null;
}

async function reloadFolders() {
  const list = await listLibraryFolders();
  folders.value = list;
  if (!selectedFolderId.value && list.length > 0) {
    selectedFolderId.value = list[0].id;
  } else if (selectedFolderId.value && !list.some((folder) => folder.id === selectedFolderId.value)) {
    selectedFolderId.value = list[0]?.id || "";
  }
}

async function reloadFolderAssets() {
  if (!selectedFolderId.value) {
    folderAssets.value = [];
    return;
  }
  const [folder, assets] = await Promise.all([
    getLibraryFolder(selectedFolderId.value),
    listLibraryFolderAssets(selectedFolderId.value),
  ]);
  const idx = folders.value.findIndex((value) => value.id === folder.id);
  if (idx >= 0) folders.value[idx] = folder;
  folderAssets.value = assets.assets;
}

async function createFolderEntry() {
  const name = folderName.value.trim();
  if (!name) {
    setFeedback("请填写文件夹名称。", true);
    return;
  }
  saving.value = true;
  setFeedback("");
  try {
    await createLibraryFolder({
      name,
      categoryId: folderCategoryId.value.trim() || "other",
      coverType: "blank",
    });
    folderName.value = "";
    await reloadFolders();
    await reloadFolderAssets();
    setFeedback("文件夹已创建。");
  } catch (err) {
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "创建文件夹失败。", true);
  } finally {
    saving.value = false;
  }
}

async function uploadCover() {
  if (!selectedFolderId.value) {
    setFeedback("请先选择文件夹。", true);
    return;
  }
  if (!coverFile.value) {
    setFeedback("请选择封面图片。", true);
    return;
  }
  saving.value = true;
  setFeedback("");
  try {
    await uploadLibraryFolderCover({
      folderId: selectedFolderId.value,
      file: coverFile.value,
    });
    coverFile.value = null;
    const input = document.querySelector<HTMLInputElement>("#library-cover-file");
    if (input) input.value = "";
    await reloadFolders();
    await reloadFolderAssets();
    setFeedback("封面上传成功。");
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 401) {
      setFeedback("请先登录管理员账号。", true);
      return;
    }
    if (e?.data?.error === "cover_invalid_type") {
      setFeedback("封面仅支持图片类型。", true);
      return;
    }
    setFeedback("封面上传失败。", true);
  } finally {
    saving.value = false;
  }
}

async function uploadAssetEntry() {
  if (!selectedFolderId.value) {
    setFeedback("请先选择文件夹。", true);
    return;
  }
  if (!assetFile.value) {
    setFeedback("请选择 .ggb 或 PhET HTML 文件。", true);
    return;
  }
  saving.value = true;
  setFeedback("");
  try {
    await uploadLibraryAsset({
      folderId: selectedFolderId.value,
      file: assetFile.value,
      openMode: openMode.value,
    });
    assetFile.value = null;
    const input = document.querySelector<HTMLInputElement>("#library-asset-file");
    if (input) input.value = "";
    await reloadFolders();
    await reloadFolderAssets();
    setFeedback("资源上传成功。");
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 401) {
      setFeedback("请先登录管理员账号。", true);
      return;
    }
    if (e?.data?.error === "unsupported_asset_type") {
      setFeedback("当前仅支持上传 .ggb 或 PhET HTML 文件。", true);
      return;
    }
    setFeedback("资源上传失败。", true);
  } finally {
    saving.value = false;
  }
}

async function removeAsset(assetId: string) {
  if (!window.confirm("确定删除该资源吗？")) return;
  saving.value = true;
  setFeedback("");
  try {
    await deleteLibraryAsset(assetId);
    await reloadFolders();
    await reloadFolderAssets();
    setFeedback("资源已删除。");
  } catch (err) {
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "删除资源失败。", true);
  } finally {
    saving.value = false;
  }
}

async function removeFolder(folderId: string) {
  if (!window.confirm("确定删除该文件夹吗？")) return;
  saving.value = true;
  setFeedback("");
  try {
    await deleteLibraryFolder(folderId);
    if (selectedFolderId.value === folderId) selectedFolderId.value = "";
    await reloadFolders();
    await reloadFolderAssets();
    setFeedback("文件夹已删除。");
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 401) {
      setFeedback("请先登录管理员账号。", true);
      return;
    }
    if (e?.data?.error === "folder_not_empty") {
      setFeedback("文件夹非空，需先删除其中资源。", true);
      return;
    }
    setFeedback("删除文件夹失败。", true);
  } finally {
    saving.value = false;
  }
}

watch(selectedFolderId, () => {
  void reloadFolderAssets();
});

onMounted(async () => {
  loading.value = true;
  setFeedback("");
  try {
    await reloadFolders();
    await reloadFolderAssets();
  } catch {
    setFeedback("加载资源库管理数据失败。", true);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="admin-library-view">
    <h2>资源库管理</h2>

    <div class="library-grid">
      <div class="admin-card">
        <h3>新建文件夹</h3>
        <label class="field">
          <span>名称</span>
          <input v-model="folderName" class="field-input" type="text" />
        </label>
        <label class="field">
          <span>分类 ID</span>
          <input v-model="folderCategoryId" class="field-input" type="text" />
        </label>
        <div class="admin-actions">
          <button type="button" class="btn btn-primary" :disabled="saving" @click="createFolderEntry">创建文件夹</button>
        </div>

        <div class="folder-list">
          <article v-for="folder in folders" :key="folder.id" class="folder-item" :class="{ active: selectedFolderId === folder.id }">
            <button type="button" class="folder-pick" @click="selectedFolderId = folder.id">
              <div class="folder-name">{{ folder.name || folder.id }}</div>
              <div class="folder-meta">{{ folder.categoryId }} · {{ folder.assetCount || 0 }} 个资源</div>
            </button>
            <button type="button" class="btn btn-ghost" :disabled="saving" @click="removeFolder(folder.id)">删除</button>
          </article>
          <div v-if="!loading && folders.length === 0" class="empty">暂无文件夹。</div>
        </div>
      </div>

      <div class="admin-card">
        <h3>文件夹操作</h3>
        <div class="field">
          <span>当前文件夹</span>
          <div class="selected-folder">{{ selectedFolder?.name || "未选择" }}</div>
        </div>

        <label class="field">
          <span>封面图片</span>
          <input id="library-cover-file" class="field-input" type="file" accept="image/*" @change="onCoverFileChange" />
        </label>
        <div class="admin-actions">
          <button type="button" class="btn btn-ghost" :disabled="saving" @click="uploadCover">上传封面</button>
        </div>

        <label class="field">
          <span>.ggb / PhET HTML</span>
          <input
            id="library-asset-file"
            class="field-input"
            type="file"
            accept=".ggb,.html,.htm,application/vnd.geogebra.file,text/html"
            @change="onAssetFileChange"
          />
        </label>
        <label class="field">
          <span>打开方式</span>
          <select v-model="openMode" class="field-input">
            <option value="embed">容器页打开</option>
            <option value="download">仅下载</option>
          </select>
        </label>
        <div class="admin-actions">
          <button type="button" class="btn btn-primary" :disabled="saving" @click="uploadAssetEntry">上传资源</button>
        </div>

        <div class="asset-list">
          <article v-for="asset in folderAssets" :key="asset.id" class="asset-item">
            <div>
              <div class="asset-name">{{ asset.fileName || asset.id }}</div>
              <div class="asset-meta">{{ asset.openMode === "embed" ? "容器页" : "下载" }}</div>
            </div>
            <button type="button" class="btn btn-ghost" :disabled="saving" @click="removeAsset(asset.id)">删除</button>
          </article>
          <div v-if="selectedFolderId && folderAssets.length === 0" class="empty">该文件夹暂无资源。</div>
        </div>
      </div>
    </div>

    <div v-if="feedback" class="admin-feedback" :class="{ error: feedbackError, success: !feedbackError }">{{ feedback }}</div>
  </section>
</template>

<style scoped>
.admin-library-view {
  display: grid;
  gap: 12px;
}

.library-grid {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(300px, 1fr);
  gap: 12px;
}

.folder-list,
.asset-list {
  display: grid;
  gap: 8px;
}

.folder-item,
.asset-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface) 92%, var(--bg));
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.folder-item.active {
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
}

.folder-pick {
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  padding: 0;
  cursor: pointer;
  flex: 1;
}

.folder-name,
.asset-name {
  font-weight: 600;
}

.folder-meta,
.asset-meta,
.selected-folder {
  font-size: 13px;
  color: var(--muted);
}

.empty {
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 12px;
  color: var(--muted);
  font-size: 13px;
}

@media (max-width: 900px) {
  .library-grid {
    grid-template-columns: 1fr;
  }
}
</style>
