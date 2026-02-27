<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  type AdminItemRow,
  deleteAdminItem,
  listAdminItems,
  listTaxonomy,
  updateAdminItem,
  uploadHtmlItem,
} from "../../features/admin/adminApi";

type AdminItem = AdminItemRow;

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
const actionFeedback = ref("");
const actionFeedbackError = ref(false);

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
const selectedItem = computed(() => items.value.find((item) => item.id === editingId.value) || null);
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

function setActionFeedback(text: string, isError = false) {
  actionFeedback.value = text;
  actionFeedbackError.value = isError;
}

function buildRiskConfirmMessage(details: any): string {
  const findings = Array.isArray(details?.findings) ? details.findings : [];
  if (findings.length === 0) {
    return "检测到潜在风险内容，确认后继续上传。是否继续？";
  }
  const lines = findings.slice(0, 6).map((item: any, index: number) => {
    const severity = String(item?.severity || "unknown");
    const message = String(item?.message || "潜在风险");
    const source = item?.source ? ` (${String(item.source)})` : "";
    return `${index + 1}. [${severity}] ${message}${source}`;
  });
  const truncated = details?.truncated ? "\n...（仅展示部分风险项）" : "";
  const summary =
    typeof details?.summary === "string" && details.summary
      ? details.summary
      : `检测到 ${findings.length} 项潜在风险特征。`;
  return `${summary}\n\n${lines.join("\n")}${truncated}\n\n是否仍继续上传？`;
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
  setActionFeedback("");
}

function syncEditStateWithItems() {
  const currentId = editingId.value;
  if (!currentId) return;
  const currentItem = items.value.find((item) => item.id === currentId);
  if (!currentItem) resetEdit();
}

async function reloadTaxonomy() {
  const data = await listTaxonomy();
  groups.value = Array.isArray(data?.groups) ? data.groups : [];
  categories.value = Array.isArray(data?.categories) ? data.categories : [];
  if (!categories.value.some((row) => row.id === categoryId.value)) {
    categoryId.value = categories.value[0]?.id || "other";
  }
  if (!categories.value.some((row) => row.id === editCategoryId.value)) {
    editCategoryId.value = categories.value[0]?.id || "other";
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
    syncEditStateWithItems();
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
    setActionFeedback("请选择 HTML 或 ZIP 文件。", true);
    return;
  }
  saving.value = true;
  setActionFeedback("");

  try {
    const basePayload = {
      file: file.value,
      categoryId: categoryId.value,
      title: title.value.trim(),
      description: description.value.trim(),
    };

    try {
      await uploadHtmlItem(basePayload);
    } catch (err) {
      const e = err as { status?: number; data?: any };
      if (e?.data?.error !== "risky_html_requires_confirmation") {
        throw err;
      }

      const confirmed = window.confirm(buildRiskConfirmMessage(e?.data?.details));
      if (!confirmed) {
        setActionFeedback("已取消风险上传。", true);
        return;
      }

      await uploadHtmlItem({
        ...basePayload,
        allowRiskyHtml: true,
      });
    }

    file.value = null;
    title.value = "";
    description.value = "";
    const input = document.querySelector<HTMLInputElement>("#upload-file-input");
    if (input) input.value = "";
    await reloadUploads({ reset: true });
    setActionFeedback("上传成功。", false);
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 401) {
      setActionFeedback("请先登录管理员账号。", true);
      return;
    }
    if (e?.data?.error === "missing_file") {
      setActionFeedback("请选择 HTML 或 ZIP 文件。", true);
      return;
    }
    if (e?.data?.error === "invalid_file_type") {
      setActionFeedback("仅支持上传 HTML 或 ZIP。", true);
      return;
    }
    setActionFeedback("上传失败。", true);
  } finally {
    saving.value = false;
  }
}

async function saveEdit(id: string) {
  saving.value = true;
  setActionFeedback("");
  try {
    await updateAdminItem(id, {
      title: editTitle.value.trim(),
      description: editDescription.value.trim(),
      categoryId: editCategoryId.value,
      order: Number(editOrder.value || 0),
      published: editPublished.value,
      hidden: editHidden.value,
    });
    await reloadUploads({ reset: true });
    const updated = items.value.find((item) => item.id === id);
    if (updated) beginEdit(updated);
    setActionFeedback("保存成功。", false);
  } catch (err) {
    const e = err as { status?: number };
    setActionFeedback(e?.status === 401 ? "请先登录管理员账号。" : "保存失败。", true);
  } finally {
    saving.value = false;
  }
}

async function removeItem(id: string) {
  if (!window.confirm("确定删除该上传内容吗？")) return;
  saving.value = true;
  setActionFeedback("");
  try {
    await deleteAdminItem(id);
    if (editingId.value === id) resetEdit();
    await reloadUploads({ reset: true });
    setActionFeedback("上传内容已删除。", false);
  } catch (err) {
    const e = err as { status?: number };
    setActionFeedback(e?.status === 401 ? "请先登录管理员账号。" : "删除失败。", true);
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

    <div class="workspace-grid">
      <div class="admin-panel list-panel admin-card">
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

        <div class="actions admin-actions">
          <button type="button" class="btn btn-primary" :disabled="saving" @click="submitUpload">上传</button>
        </div>

        <div class="list-divider" />

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

        <article v-for="item in items" :key="item.id" class="item-card" :class="{ selected: editingId === item.id }">
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
                {{ editingId === item.id ? "已选中" : "编辑" }}
              </button>
              <button type="button" class="btn btn-danger" :disabled="saving" @click="removeItem(item.id)">删除</button>
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

      <aside class="admin-panel editor-panel admin-card">
        <div class="editor-header">
          <h3>编辑面板</h3>
          <div class="meta" v-if="selectedItem">{{ selectedItem.id }}</div>
        </div>

        <div v-if="actionFeedback" class="action-feedback admin-feedback" :class="{ error: actionFeedbackError, success: !actionFeedbackError }">
          {{ actionFeedback }}
        </div>

        <div v-if="!selectedItem" class="empty">请先在左侧选择一条上传内容进行编辑。</div>

        <div v-else class="editor-form">
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

          <div class="editor-footer">
            <div class="actions admin-actions">
              <button type="button" class="btn btn-ghost" @click="resetEdit">取消</button>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="saving"
                @click="saveEdit(selectedItem.id)"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </aside>
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

.workspace-grid {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 12px;
}

.admin-panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
  display: grid;
  gap: 10px;
}

.list-panel,
.editor-panel {
  align-content: start;
}

.editor-panel {
  position: sticky;
  top: 80px;
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
  flex-wrap: wrap;
}

.list-divider {
  border-top: 1px dashed var(--border);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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

.item-card.selected {
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
  background: color-mix(in srgb, var(--primary) 9%, var(--surface));
}

.item-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
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

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.editor-form {
  display: grid;
  gap: 10px;
}

.editor-footer {
  display: grid;
  gap: 8px;
}

.action-feedback {
  font-size: 13px;
  color: var(--muted);
}

.action-feedback.error {
  color: var(--danger);
}

.action-feedback.success {
  color: #15803d;
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
  flex-wrap: wrap;
}

.meta {
  color: var(--muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}

@media (max-width: 1024px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .editor-panel {
    position: static;
  }
}
</style>
