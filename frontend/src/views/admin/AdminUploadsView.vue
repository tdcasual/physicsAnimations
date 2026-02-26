<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  deleteAdminItem,
  listAdminItems,
  listTaxonomy,
  updateAdminItem,
  uploadHtmlItem,
} from "../../features/admin/adminApi";

interface AdminItem {
  id: string;
  type: string;
  categoryId: string;
  title: string;
  description: string;
  order?: number;
  published?: boolean;
  hidden?: boolean;
  src?: string;
  thumbnail?: string;
}

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
const errorText = ref("");

const items = ref<AdminItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 24;
const query = ref("");

const groups = ref<GroupRow[]>([]);
const categories = ref<CategoryRow[]>([]);

const categoryId = ref("other");
const file = ref<File | null>(null);
const title = ref("");
const description = ref("");

const editingId = ref("");
const editTitle = ref("");
const editDescription = ref("");
const editCategoryId = ref("other");
const editOrder = ref(0);
const editPublished = ref(true);
const editHidden = ref(false);

const hasMore = computed(() => items.value.length < total.value);
let latestReloadSeq = 0;
const categoryOptions = computed(() => {
  const groupMap = new Map(groups.value.map((group) => [group.id, group.title]));
  return categories.value.map((category) => ({
    value: category.id,
    label: `${groupMap.get(category.groupId) || category.groupId} / ${category.title}`,
  }));
});

function viewerHref(id: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/+$/, "/")}viewer/${encodeURIComponent(id)}`;
}

function onSelectFile(event: Event) {
  const target = event.target as HTMLInputElement;
  file.value = target.files?.[0] || null;
}

function resetEdit() {
  editingId.value = "";
  editTitle.value = "";
  editDescription.value = "";
  editCategoryId.value = "other";
  editOrder.value = 0;
  editPublished.value = true;
  editHidden.value = false;
}

function beginEdit(item: AdminItem) {
  editingId.value = item.id;
  editTitle.value = item.title || "";
  editDescription.value = item.description || "";
  editCategoryId.value = item.categoryId || "other";
  editOrder.value = Number(item.order || 0);
  editPublished.value = item.published !== false;
  editHidden.value = item.hidden === true;
}

async function reloadTaxonomy() {
  const data = await listTaxonomy();
  groups.value = Array.isArray(data?.groups) ? data.groups : [];
  categories.value = Array.isArray(data?.categories) ? data.categories : [];
  if (!categories.value.some((row) => row.id === categoryId.value)) {
    categoryId.value = categories.value[0]?.id || "other";
  }
}

async function reloadUploads(params: { reset: boolean } = { reset: true }) {
  const requestSeq = ++latestReloadSeq;
  loading.value = true;
  errorText.value = "";

  try {
    const nextPage = params.reset ? 1 : page.value + 1;
    const data = await listAdminItems({
      page: nextPage,
      pageSize,
      q: query.value.trim(),
      type: "upload",
    });
    const received = Array.isArray(data?.items) ? data.items : [];
    if (requestSeq !== latestReloadSeq) return;
    page.value = Number(data?.page || nextPage);
    total.value = Number(data?.total || 0);
    items.value = params.reset ? received : [...items.value, ...received];
    if (!items.value.some((item) => item.id === editingId.value)) {
      resetEdit();
    }
  } catch (err) {
    if (requestSeq !== latestReloadSeq) return;
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "加载上传列表失败。";
  } finally {
    if (requestSeq === latestReloadSeq) {
      loading.value = false;
    }
  }
}

async function submitUpload() {
  if (!file.value) {
    errorText.value = "请选择 HTML 或 ZIP 文件。";
    return;
  }
  saving.value = true;
  errorText.value = "";

  try {
    await uploadHtmlItem({
      file: file.value,
      categoryId: categoryId.value,
      title: title.value.trim(),
      description: description.value.trim(),
    });
    file.value = null;
    title.value = "";
    description.value = "";
    const input = document.querySelector<HTMLInputElement>("#upload-file-input");
    if (input) input.value = "";
    await reloadUploads({ reset: true });
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 401) {
      errorText.value = "请先登录管理员账号。";
      return;
    }
    if (e?.data?.error === "missing_file") {
      errorText.value = "请选择 HTML 或 ZIP 文件。";
      return;
    }
    if (e?.data?.error === "invalid_file_type") {
      errorText.value = "仅支持上传 HTML 或 ZIP。";
      return;
    }
    errorText.value = "上传失败。";
  } finally {
    saving.value = false;
  }
}

async function saveEdit(id: string) {
  saving.value = true;
  errorText.value = "";
  try {
    await updateAdminItem(id, {
      title: editTitle.value.trim(),
      description: editDescription.value.trim(),
      categoryId: editCategoryId.value,
      order: Number(editOrder.value || 0),
      published: editPublished.value,
      hidden: editHidden.value,
    });
    resetEdit();
    await reloadUploads({ reset: true });
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "保存失败。";
  } finally {
    saving.value = false;
  }
}

async function removeItem(id: string) {
  if (!window.confirm("确定删除该上传内容吗？")) return;
  saving.value = true;
  errorText.value = "";
  try {
    await deleteAdminItem(id);
    if (editingId.value === id) resetEdit();
    await reloadUploads({ reset: true });
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "删除失败。";
  } finally {
    saving.value = false;
  }
}

let timer = 0;
watch(query, () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void reloadUploads({ reset: true });
  }, 250);
});

onMounted(async () => {
  await reloadTaxonomy().catch(() => {});
  await reloadUploads({ reset: true });
});

onBeforeUnmount(() => {
  window.clearTimeout(timer);
});
</script>

<template>
  <section class="admin-uploads-view">
    <h2>上传管理</h2>

    <div class="admin-panel">
      <h3>上传 HTML / ZIP</h3>

      <div class="form-grid">
        <label class="field">
          <span>分类</span>
          <select v-model="categoryId" class="field-input">
            <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>文件（HTML / ZIP）</span>
          <input
            id="upload-file-input"
            class="field-input"
            type="file"
            accept=".html,.htm,.zip,text/html,application/zip"
            @change="onSelectFile"
          />
        </label>
      </div>

      <label class="field">
        <span>标题（可选）</span>
        <input v-model="title" class="field-input" type="text" />
      </label>

      <label class="field">
        <span>描述（可选）</span>
        <textarea v-model="description" class="field-input field-textarea" />
      </label>

      <div class="actions">
        <button type="button" class="btn btn-primary" :disabled="saving" @click="submitUpload">上传</button>
      </div>
    </div>

    <div class="admin-panel">
      <div class="list-header">
        <h3>上传列表</h3>
        <input
          v-model="query"
          class="field-input list-search"
          type="search"
          placeholder="搜索上传内容..."
          autocomplete="off"
        />
      </div>

      <div v-if="errorText" class="error-text">{{ errorText }}</div>
      <div v-if="items.length === 0 && !loading" class="empty">暂无上传内容。</div>

      <article v-for="item in items" :key="item.id" class="item-card">
        <div class="item-head">
          <div>
            <div class="item-title">{{ item.title || item.id }}</div>
            <div class="item-meta">
              {{ item.categoryId }} · {{ item.type }} · {{ item.hidden ? "隐藏" : "可见" }} ·
              {{ item.published === false ? "草稿" : "已发布" }}
            </div>
          </div>
          <div class="item-actions">
            <a class="btn btn-ghost" :href="viewerHref(item.id)" target="_blank" rel="noreferrer">预览</a>
            <button type="button" class="btn btn-ghost" @click="beginEdit(item)">
              {{ editingId === item.id ? "编辑中" : "编辑" }}
            </button>
            <button type="button" class="btn btn-danger" :disabled="saving" @click="removeItem(item.id)">删除</button>
          </div>
        </div>

        <div v-if="editingId === item.id" class="item-edit">
          <label class="field">
            <span>标题</span>
            <input v-model="editTitle" class="field-input" type="text" />
          </label>

          <label class="field">
            <span>描述</span>
            <textarea v-model="editDescription" class="field-input field-textarea" />
          </label>

          <div class="form-grid">
            <label class="field">
              <span>分类</span>
              <select v-model="editCategoryId" class="field-input">
                <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>排序（越大越靠前）</span>
              <input v-model.number="editOrder" class="field-input" type="number" />
            </label>
          </div>

          <div class="form-grid">
            <label class="checkbox">
              <input v-model="editPublished" type="checkbox" />
              <span>已发布</span>
            </label>

            <label class="checkbox">
              <input v-model="editHidden" type="checkbox" />
              <span>隐藏</span>
            </label>
          </div>

          <div class="actions">
            <button type="button" class="btn btn-ghost" @click="resetEdit">取消</button>
            <button type="button" class="btn btn-primary" :disabled="saving" @click="saveEdit(item.id)">保存</button>
          </div>
        </div>
      </article>

      <div class="list-footer">
        <div class="meta">已加载 {{ items.length }} / {{ total }}</div>
        <button
          v-if="hasMore"
          type="button"
          class="btn btn-ghost"
          :disabled="loading"
          @click="reloadUploads({ reset: false })"
        >
          加载更多
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-uploads-view {
  display: grid;
  gap: 14px;
}

h2 {
  margin: 0;
}

.admin-panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
  display: grid;
  gap: 10px;
}

h3 {
  margin: 0;
  font-size: 16px;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}

.field-input {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  padding: 8px 10px;
}

.field-textarea {
  min-height: 72px;
  resize: vertical;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.list-search {
  width: min(360px, 100%);
}

.item-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  background: color-mix(in srgb, var(--surface) 90%, var(--bg));
}

.item-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.item-title {
  font-weight: 600;
}

.item-meta {
  color: var(--muted);
  font-size: 12px;
}

.item-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.item-edit {
  margin-top: 12px;
  border-top: 1px dashed var(--border);
  padding-top: 10px;
  display: grid;
  gap: 10px;
}

.btn {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--surface);
  color: inherit;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
}

.btn-ghost {
  background: color-mix(in srgb, var(--surface) 88%, var(--bg));
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
}

.btn-danger {
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
  color: color-mix(in srgb, var(--danger) 75%, var(--text));
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
}

.error-text {
  color: var(--danger);
  font-size: 13px;
}

.empty {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 16px;
  color: var(--muted);
}

.list-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.meta {
  color: var(--muted);
  font-size: 12px;
}
</style>
