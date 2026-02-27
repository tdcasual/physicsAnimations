<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { listTaxonomy } from "../../features/admin/adminApi";
import {
  createLibraryFolder,
  deleteLibraryAsset,
  deleteLibraryFolder,
  getLibraryFolder,
  listLibraryFolderAssets,
  listLibraryFolders,
  updateLibraryAsset,
  uploadLibraryAsset,
  uploadLibraryFolderCover,
} from "../../features/library/libraryApi";
import type { LibraryAsset, LibraryFolder, LibraryOpenMode } from "../../features/library/types";

interface CategoryRow {
  id: string;
  groupId: string;
  title: string;
}

interface GroupRow {
  id: string;
  title: string;
}

const loading = ref(false);
const saving = ref(false);
const feedback = ref("");
const feedbackError = ref(false);

const folders = ref<LibraryFolder[]>([]);
const selectedFolderId = ref("");
const folderAssets = ref<LibraryAsset[]>([]);
const categories = ref<CategoryRow[]>([]);
const groups = ref<GroupRow[]>([]);

const folderName = ref("");
const folderCategoryId = ref("other");
const createCoverFile = ref<File | null>(null);

const coverFile = ref<File | null>(null);
const assetFile = ref<File | null>(null);
const assetDisplayName = ref("");
const openMode = ref<LibraryOpenMode>("download");

const selectedFolder = computed(() => folders.value.find((folder) => folder.id === selectedFolderId.value) || null);
const groupedCategoryOptions = computed(() => {
  const groupsMap = new Map(groups.value.map((group) => [group.id, group.title]));
  const options = categories.value.map((category) => ({
    value: category.id,
    label: `${groupsMap.get(category.groupId) || category.groupId} / ${category.title}`,
  }));
  if (options.length === 0) {
    options.push({
      value: "other",
      label: "物理 / 其他",
    });
  }
  return options;
});

function setFeedback(text: string, isError = false) {
  feedback.value = text;
  feedbackError.value = isError;
}

function onCreateCoverFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  createCoverFile.value = target.files?.[0] || null;
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

function syncCategorySelection() {
  if (groupedCategoryOptions.value.some((item) => item.value === folderCategoryId.value)) return;
  folderCategoryId.value = groupedCategoryOptions.value[0]?.value || "other";
}

async function reloadTaxonomy() {
  const data = await listTaxonomy();
  groups.value = Array.isArray(data?.groups) ? data.groups : [];
  categories.value = Array.isArray(data?.categories) ? data.categories : [];
  syncCategorySelection();
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
    const created = await createLibraryFolder({
      name,
      categoryId: folderCategoryId.value.trim() || "other",
      coverType: "blank",
    });
    const createdFolderId = String(created?.folder?.id || "");
    if (createCoverFile.value && createdFolderId) {
      await uploadLibraryFolderCover({
        folderId: createdFolderId,
        file: createCoverFile.value,
      });
    }
    folderName.value = "";
    createCoverFile.value = null;
    const createCoverInput = document.querySelector<HTMLInputElement>("#library-create-cover-file");
    if (createCoverInput) createCoverInput.value = "";
    await reloadFolders();
    await reloadFolderAssets();
    setFeedback("文件夹已创建。");
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.data?.error === "cover_invalid_type") {
      setFeedback("封面仅支持图片类型。", true);
      return;
    }
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
      displayName: assetDisplayName.value.trim(),
    });
    assetFile.value = null;
    assetDisplayName.value = "";
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

async function renameAssetDisplayName(asset: LibraryAsset) {
  const current = asset.displayName || asset.fileName || "";
  const next = window.prompt("请输入新的显示名称（留空则恢复文件名显示）", current);
  if (next === null) return;
  saving.value = true;
  setFeedback("");
  try {
    await updateLibraryAsset(asset.id, { displayName: next.trim() });
    await reloadFolders();
    await reloadFolderAssets();
    setFeedback("显示名称已更新。");
  } catch (err) {
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "更新显示名称失败。", true);
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
    await reloadTaxonomy().catch(() => {});
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
          <span>分类</span>
          <select v-model="folderCategoryId" class="field-input">
            <option v-for="option in groupedCategoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>创建时封面（可选）</span>
          <input
            id="library-create-cover-file"
            class="field-input"
            type="file"
            accept="image/*"
            @change="onCreateCoverFileChange"
          />
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
          <span>更改封面</span>
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
          <span>资源显示名称（可选）</span>
          <input v-model="assetDisplayName" class="field-input" type="text" placeholder="例如：力学-抛体运动演示" />
        </label>
        <label class="field">
          <span>打开方式</span>
          <select v-model="openMode" class="field-input">
            <option value="download">打开原文件（默认）</option>
            <option value="embed">容器页打开</option>
          </select>
        </label>
        <div class="admin-actions">
          <button type="button" class="btn btn-primary" :disabled="saving" @click="uploadAssetEntry">上传资源</button>
        </div>

        <div class="asset-list">
          <article v-for="asset in folderAssets" :key="asset.id" class="asset-item">
            <div class="asset-main">
              <div class="asset-name">{{ asset.displayName || asset.fileName || asset.id }}</div>
              <div class="asset-meta">源文件：{{ asset.fileName || asset.id }}</div>
              <div class="asset-meta">{{ asset.openMode === "embed" ? "容器页" : "原文件" }}</div>
            </div>
            <div class="asset-actions-inline">
              <button type="button" class="btn btn-ghost" :disabled="saving" @click="renameAssetDisplayName(asset)">重命名显示名</button>
              <button type="button" class="btn btn-ghost" :disabled="saving" @click="removeAsset(asset.id)">删除</button>
            </div>
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

.asset-main {
  display: grid;
  gap: 2px;
}

.asset-actions-inline {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
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
