<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  createLinkItem,
  deleteAdminItem,
  listAdminItems,
  listTaxonomy,
  restoreBuiltinItem,
  updateAdminItem,
} from "../../features/admin/adminApi";

interface AdminItem {
  id: string;
  type: string;
  categoryId: string;
  title: string;
  description: string;
  thumbnail?: string;
  src?: string;
  order?: number;
  published?: boolean;
  hidden?: boolean;
  deleted?: boolean;
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

const categories = ref<CategoryRow[]>([]);
const groups = ref<GroupRow[]>([]);

const linkCategoryId = ref("other");
const linkUrl = ref("");
const linkTitle = ref("");
const linkDescription = ref("");

const editingId = ref("");
const editTitle = ref("");
const editDescription = ref("");
const editCategoryId = ref("other");
const editOrder = ref(0);
const editPublished = ref(true);
const editHidden = ref(false);

const groupedCategoryOptions = computed(() => {
  const groupsMap = new Map(groups.value.map((group) => [group.id, group.title]));
  return categories.value.map((category) => ({
    value: category.id,
    label: `${groupsMap.get(category.groupId) || category.groupId} / ${category.title}`,
  }));
});

const hasMore = computed(() => items.value.length < total.value);

function viewerHref(id: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/+$/, "/")}viewer/${encodeURIComponent(id)}`;
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
  if (!categories.value.some((category) => category.id === linkCategoryId.value)) {
    linkCategoryId.value = categories.value[0]?.id || "other";
  }
}

async function reloadItems(params: { reset: boolean } = { reset: true }) {
  if (loading.value) return;
  loading.value = true;
  errorText.value = "";

  try {
    const nextPage = params.reset ? 1 : page.value + 1;
    const data = await listAdminItems({
      page: nextPage,
      pageSize,
      q: query.value.trim(),
    });
    const received = Array.isArray(data?.items) ? data.items : [];
    page.value = Number(data?.page || nextPage);
    total.value = Number(data?.total || 0);
    items.value = params.reset ? received : [...items.value, ...received];
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "加载内容失败。";
  } finally {
    loading.value = false;
  }
}

async function submitLink() {
  if (!linkUrl.value.trim()) return;
  saving.value = true;
  errorText.value = "";
  try {
    await createLinkItem({
      url: linkUrl.value.trim(),
      categoryId: linkCategoryId.value,
      title: linkTitle.value.trim(),
      description: linkDescription.value.trim(),
    });
    linkUrl.value = "";
    linkTitle.value = "";
    linkDescription.value = "";
    await reloadItems({ reset: true });
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "新增链接失败。";
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
    await reloadItems({ reset: true });
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "保存失败。";
  } finally {
    saving.value = false;
  }
}

async function removeItem(id: string) {
  if (!window.confirm("确定删除这条内容吗？")) return;
  saving.value = true;
  errorText.value = "";
  try {
    await deleteAdminItem(id);
    if (editingId.value === id) resetEdit();
    await reloadItems({ reset: true });
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "删除失败。";
  } finally {
    saving.value = false;
  }
}

async function restoreItem(id: string) {
  saving.value = true;
  errorText.value = "";
  try {
    await restoreBuiltinItem(id);
    await reloadItems({ reset: true });
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "恢复失败。";
  } finally {
    saving.value = false;
  }
}

let timer = 0;
watch(query, () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void reloadItems({ reset: true });
  }, 250);
});

onMounted(async () => {
  await reloadTaxonomy().catch(() => {});
  await reloadItems({ reset: true });
});
</script>

<template>
  <section class="admin-content-view">
    <h2>内容管理</h2>

    <div class="admin-panel">
      <h3>添加网页链接</h3>
      <div class="form-grid">
        <label class="field">
          <span>分类</span>
          <select v-model="linkCategoryId" class="field-input">
            <option v-for="option in groupedCategoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <label class="field">
        <span>链接</span>
        <input v-model="linkUrl" class="field-input" type="url" placeholder="https://example.com" />
      </label>

      <label class="field">
        <span>标题（可选）</span>
        <input v-model="linkTitle" class="field-input" type="text" />
      </label>

      <label class="field">
        <span>描述（可选）</span>
        <textarea v-model="linkDescription" class="field-input field-textarea" />
      </label>

      <div class="actions">
        <button type="button" class="btn btn-primary" :disabled="saving" @click="submitLink">添加</button>
      </div>
    </div>

    <div class="admin-panel">
      <div class="list-header">
        <h3>内容列表</h3>
        <input
          v-model="query"
          class="field-input list-search"
          type="search"
          placeholder="搜索内容..."
          autocomplete="off"
        />
      </div>

      <div v-if="errorText" class="error-text">{{ errorText }}</div>

      <div v-if="items.length === 0 && !loading" class="empty">暂无内容。</div>

      <article v-for="item in items" :key="item.id" class="item-card">
        <div class="item-head">
          <div>
            <div class="item-title">{{ item.title || item.id }}</div>
            <div class="item-meta">
              {{ item.categoryId }} · {{ item.type }} · {{ item.deleted ? "已删除" : "正常" }} · {{ item.hidden ? "隐藏" : "可见" }} ·
              {{ item.published === false ? "草稿" : "已发布" }}
            </div>
          </div>
          <div class="item-actions">
            <a class="btn btn-ghost" :href="viewerHref(item.id)" target="_blank" rel="noreferrer">预览</a>
            <button
              v-if="item.deleted"
              type="button"
              class="btn btn-primary"
              :disabled="saving"
              @click="restoreItem(item.id)"
            >
              恢复
            </button>
            <button type="button" class="btn btn-ghost" @click="beginEdit(item)">
              {{ editingId === item.id ? "编辑中" : "编辑" }}
            </button>
            <button
              v-if="!item.deleted"
              type="button"
              class="btn btn-danger"
              :disabled="saving"
              @click="removeItem(item.id)"
            >
              删除
            </button>
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
                <option v-for="option in groupedCategoryOptions" :key="option.value" :value="option.value">
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
          @click="reloadItems({ reset: false })"
        >
          加载更多
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-content-view {
  display: grid;
  gap: 14px;
}

h2 {
  margin: 0;
}

.admin-panel {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 12px;
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
  gap: 10px;
  align-items: center;
}

.list-search {
  width: min(360px, 100%);
}

.item-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 10px;
  background: color-mix(in srgb, var(--surface) 90%, var(--bg));
}

.item-head {
  display: flex;
  justify-content: space-between;
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
}

.item-edit {
  display: grid;
  gap: 10px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
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

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
}

.btn-ghost {
  background: color-mix(in srgb, var(--surface) 88%, var(--bg));
}

.btn-danger {
  background: color-mix(in srgb, var(--danger) 20%, var(--surface));
  border-color: color-mix(in srgb, var(--danger) 50%, var(--border));
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
