<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  createCategory,
  createGroup,
  deleteCategory,
  deleteGroup,
  listTaxonomy,
  updateCategory,
  updateGroup,
} from "../../features/admin/adminApi";

interface GroupRow {
  id: string;
  title: string;
  order?: number;
  hidden?: boolean;
}

interface CategoryRow {
  id: string;
  groupId: string;
  title: string;
  order?: number;
  hidden?: boolean;
  count?: number;
}

const loading = ref(false);
const saving = ref(false);
const errorText = ref("");

const groups = ref<GroupRow[]>([]);
const categories = ref<CategoryRow[]>([]);

const groupId = ref("");
const groupTitle = ref("");
const groupOrder = ref(0);
const groupHidden = ref(false);

const categoryId = ref("");
const categoryGroupId = ref("physics");
const categoryTitle = ref("");
const categoryOrder = ref(0);
const categoryHidden = ref(false);

const editingGroupId = ref("");
const editingCategoryId = ref("");

const selectedGroupId = ref("");
const selectedCategoryId = ref("");

const categoriesByGroup = computed(() => {
  const map = new Map<string, CategoryRow[]>();
  for (const category of categories.value) {
    if (!map.has(category.groupId)) map.set(category.groupId, []);
    map.get(category.groupId)!.push(category);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (Number(b.order || 0) - Number(a.order || 0)) || a.title.localeCompare(b.title, "zh-CN"));
  }
  return map;
});

function resetGroupForm() {
  editingGroupId.value = "";
  groupId.value = "";
  groupTitle.value = "";
  groupOrder.value = 0;
  groupHidden.value = false;
}

function resetCategoryForm() {
  editingCategoryId.value = "";
  categoryId.value = "";
  categoryGroupId.value = selectedGroupId.value || "physics";
  categoryTitle.value = "";
  categoryOrder.value = 0;
  categoryHidden.value = false;
}

function selectGroup(group: GroupRow) {
  selectedGroupId.value = group.id;
  selectedCategoryId.value = "";
}

function beginGroupEdit(group: GroupRow) {
  editingGroupId.value = group.id;
  groupId.value = group.id;
  groupTitle.value = group.title;
  groupOrder.value = Number(group.order || 0);
  groupHidden.value = group.hidden === true;
}

function beginCategoryEdit(category: CategoryRow) {
  editingCategoryId.value = category.id;
  categoryId.value = category.id;
  categoryGroupId.value = category.groupId || "physics";
  categoryTitle.value = category.title;
  categoryOrder.value = Number(category.order || 0);
  categoryHidden.value = category.hidden === true;
  selectedCategoryId.value = category.id;
}

async function reloadTaxonomy() {
  loading.value = true;
  errorText.value = "";
  try {
    const data = await listTaxonomy();
    const nextGroups = Array.isArray(data?.groups) ? data.groups : [];
    const nextCategories = Array.isArray(data?.categories) ? data.categories : [];
    groups.value = nextGroups;
    categories.value = nextCategories;

    if (!groups.value.some((group) => group.id === selectedGroupId.value)) {
      selectedGroupId.value = groups.value[0]?.id || "";
    }
    if (!groups.value.some((group) => group.id === categoryGroupId.value)) {
      categoryGroupId.value = selectedGroupId.value || groups.value[0]?.id || "physics";
    }
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "加载分类数据失败。";
  } finally {
    loading.value = false;
  }
}

async function submitGroup() {
  if (!groupTitle.value.trim()) {
    errorText.value = "请填写大类标题。";
    return;
  }
  if (!editingGroupId.value && !groupId.value.trim()) {
    errorText.value = "请填写大类 ID。";
    return;
  }

  saving.value = true;
  errorText.value = "";
  try {
    if (editingGroupId.value) {
      await updateGroup(editingGroupId.value, {
        title: groupTitle.value.trim(),
        order: Number(groupOrder.value || 0),
        hidden: groupHidden.value,
      });
    } else {
      await createGroup({
        id: groupId.value.trim(),
        title: groupTitle.value.trim(),
        order: Number(groupOrder.value || 0),
        hidden: groupHidden.value,
      });
    }
    resetGroupForm();
    await reloadTaxonomy();
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 409) {
      errorText.value = "该大类 ID 已存在。";
      return;
    }
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "保存大类失败。";
  } finally {
    saving.value = false;
  }
}

async function removeGroup(id: string) {
  if (!window.confirm(`确定删除大类「${id}」吗？`)) return;
  saving.value = true;
  errorText.value = "";
  try {
    await deleteGroup(id);
    if (selectedGroupId.value === id) selectedGroupId.value = "";
    if (editingGroupId.value === id) resetGroupForm();
    await reloadTaxonomy();
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.data?.error === "group_not_empty") {
      errorText.value = "该大类下仍有二级分类，请先移动/删除二级分类。";
      return;
    }
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "删除大类失败。";
  } finally {
    saving.value = false;
  }
}

async function submitCategory() {
  if (!categoryTitle.value.trim()) {
    errorText.value = "请填写分类标题。";
    return;
  }
  if (!editingCategoryId.value && !categoryId.value.trim()) {
    errorText.value = "请填写分类 ID。";
    return;
  }

  saving.value = true;
  errorText.value = "";
  try {
    if (editingCategoryId.value) {
      await updateCategory(editingCategoryId.value, {
        groupId: categoryGroupId.value,
        title: categoryTitle.value.trim(),
        order: Number(categoryOrder.value || 0),
        hidden: categoryHidden.value,
      });
    } else {
      await createCategory({
        id: categoryId.value.trim(),
        groupId: categoryGroupId.value,
        title: categoryTitle.value.trim(),
        order: Number(categoryOrder.value || 0),
        hidden: categoryHidden.value,
      });
    }
    resetCategoryForm();
    await reloadTaxonomy();
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 409) {
      errorText.value = "该分类 ID 已存在。";
      return;
    }
    if (e?.data?.error === "unknown_group") {
      errorText.value = "大类不存在。";
      return;
    }
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "保存分类失败。";
  } finally {
    saving.value = false;
  }
}

async function removeCategory(id: string) {
  if (!window.confirm(`确定删除分类「${id}」吗？`)) return;
  saving.value = true;
  errorText.value = "";
  try {
    await deleteCategory(id);
    if (selectedCategoryId.value === id) selectedCategoryId.value = "";
    if (editingCategoryId.value === id) resetCategoryForm();
    await reloadTaxonomy();
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "删除分类失败。";
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await reloadTaxonomy();
});
</script>

<template>
  <section class="admin-taxonomy-view">
    <h2>分类管理</h2>
    <div v-if="errorText" class="error-text">{{ errorText }}</div>

    <div class="layout-grid">
      <div class="panel">
        <h3>大类 / 分类列表</h3>
        <div v-if="loading" class="empty">加载中...</div>
        <div v-else>
          <div v-for="group in groups" :key="group.id" class="group-block">
            <div class="group-row">
              <button type="button" class="group-btn" @click="selectGroup(group)">
                <strong>{{ group.title }}</strong>
                <span>({{ group.id }})</span>
              </button>
              <div class="group-actions">
                <button type="button" class="btn btn-ghost" @click="beginGroupEdit(group)">编辑</button>
                <button type="button" class="btn btn-danger" :disabled="saving" @click="removeGroup(group.id)">删除</button>
              </div>
            </div>

            <div class="category-list">
              <div
                v-for="category in categoriesByGroup.get(group.id) || []"
                :key="category.id"
                class="category-row"
                :class="{ selected: selectedCategoryId === category.id }"
              >
                <button type="button" class="category-btn" @click="beginCategoryEdit(category)">
                  {{ category.title }} ({{ category.id }}) · 数量 {{ category.count || 0 }}
                </button>
                <button type="button" class="btn btn-danger btn-sm" :disabled="saving" @click="removeCategory(category.id)">
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3>{{ editingGroupId ? "编辑大类" : "新增大类" }}</h3>
        <div class="form-grid">
          <label class="field">
            <span>大类 ID</span>
            <input v-model="groupId" class="field-input" type="text" :disabled="Boolean(editingGroupId)" />
          </label>
          <label class="field">
            <span>标题</span>
            <input v-model="groupTitle" class="field-input" type="text" />
          </label>
          <label class="field">
            <span>排序</span>
            <input v-model.number="groupOrder" class="field-input" type="number" />
          </label>
          <label class="checkbox">
            <input v-model="groupHidden" type="checkbox" />
            <span>隐藏</span>
          </label>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-ghost" @click="resetGroupForm">重置</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="submitGroup">保存</button>
        </div>

        <h3>{{ editingCategoryId ? "编辑分类" : "新增分类" }}</h3>
        <div class="form-grid">
          <label class="field">
            <span>分类 ID</span>
            <input v-model="categoryId" class="field-input" type="text" :disabled="Boolean(editingCategoryId)" />
          </label>
          <label class="field">
            <span>大类</span>
            <select v-model="categoryGroupId" class="field-input">
              <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.title }} ({{ group.id }})</option>
            </select>
          </label>
          <label class="field">
            <span>标题</span>
            <input v-model="categoryTitle" class="field-input" type="text" />
          </label>
          <label class="field">
            <span>排序</span>
            <input v-model.number="categoryOrder" class="field-input" type="number" />
          </label>
          <label class="checkbox">
            <input v-model="categoryHidden" type="checkbox" />
            <span>隐藏</span>
          </label>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-ghost" @click="resetCategoryForm">重置</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="submitCategory">保存</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-taxonomy-view {
  display: grid;
  gap: 12px;
}

h2 {
  margin: 0;
}

.layout-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
}

@media (max-width: 960px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
}

.panel {
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

.group-block {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  display: grid;
  gap: 8px;
}

.group-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.group-btn,
.category-btn {
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.group-actions {
  display: flex;
  gap: 6px;
}

.category-list {
  display: grid;
  gap: 6px;
}

.category-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
}

.category-row.selected {
  border-color: color-mix(in srgb, var(--primary) 60%, var(--border));
  background: color-mix(in srgb, var(--primary) 14%, var(--surface));
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
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

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--surface);
  color: inherit;
  font-size: 13px;
  cursor: pointer;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
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
  background: color-mix(in srgb, var(--danger) 20%, var(--surface));
  border-color: color-mix(in srgb, var(--danger) 50%, var(--border));
}

.empty {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 14px;
  color: var(--muted);
}

.error-text {
  color: var(--danger);
  font-size: 13px;
}
</style>
