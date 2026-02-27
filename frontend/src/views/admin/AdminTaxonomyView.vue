<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import {
  createCategory,
  createGroup,
  deleteCategory,
  deleteGroup,
  listTaxonomy,
  updateCategory,
  updateGroup,
} from "../../features/admin/adminApi";
import {
  buildTaxonomyTree,
  normalizeTaxonomySelection,
  sortGroupList,
  type TaxonomyCategory,
  type TaxonomyGroup,
  type TaxonomySelection,
} from "../../features/admin/taxonomyUiState";

const DEFAULT_GROUP_ID = "physics";
const UI_STATE_KEY = "pa_taxonomy_ui";

type GroupRow = TaxonomyGroup;
type CategoryRow = TaxonomyCategory;

const loading = ref(false);
const saving = ref(false);
const errorText = ref("");
const actionFeedback = ref("");
const actionFeedbackError = ref(false);

const groups = ref<GroupRow[]>([]);
const categories = ref<CategoryRow[]>([]);

const searchQuery = ref("");
const showHidden = ref(false);
const openGroupIds = ref<string[]>([DEFAULT_GROUP_ID]);
const selection = ref<TaxonomySelection | null>(null);

const groupFormTitle = ref("");
const groupFormOrder = ref(0);
const groupFormHidden = ref(false);

const createGroupId = ref("");
const createGroupTitle = ref("");
const createGroupOrder = ref(0);
const createGroupHidden = ref(false);

const createCategoryId = ref("");
const createCategoryTitle = ref("");
const createCategoryOrder = ref(0);
const createCategoryHidden = ref(false);

const categoryFormGroupId = ref(DEFAULT_GROUP_ID);
const categoryFormTitle = ref("");
const categoryFormOrder = ref(0);
const categoryFormHidden = ref(false);

const tree = computed(() =>
  buildTaxonomyTree({
    groups: groups.value,
    categories: categories.value,
    search: searchQuery.value,
    showHidden: showHidden.value,
  }),
);

const visibleGroups = computed(() => sortGroupList(groups.value).filter((group) => showHidden.value || group.hidden !== true));
const allSortedGroups = computed(() => sortGroupList(groups.value));
const groupById = computed(() => new Map(groups.value.map((group) => [group.id, group])));
const categoryById = computed(() => new Map(categories.value.map((category) => [category.id, category])));

const fallbackGroupId = computed(
  () =>
    visibleGroups.value[0]?.id ||
    allSortedGroups.value[0]?.id ||
    groups.value[0]?.id ||
    DEFAULT_GROUP_ID,
);

const selectedGroup = computed(() => {
  if (!selection.value || selection.value.kind !== "group") return null;
  return groupById.value.get(selection.value.id) || null;
});

const selectedCategory = computed(() => {
  if (!selection.value || selection.value.kind !== "category") return null;
  return categoryById.value.get(selection.value.id) || null;
});

const selectedCreateGroupId = computed(() => {
  if (selectedGroup.value) return selectedGroup.value.id;
  if (selectedCategory.value) return selectedCategory.value.groupId;
  return fallbackGroupId.value;
});

const taxonomyMetaText = computed(() => {
  if (searchQuery.value.trim()) {
    return `匹配：大类 ${tree.value.renderedGroupCount} · 二级分类 ${tree.value.renderedCategoryCount}`;
  }
  return `大类 ${tree.value.renderedGroupCount} · 二级分类 ${tree.value.renderedCategoryCount}`;
});

const canDeleteSelectedCategory = computed(() => Number(selectedCategory.value?.count || 0) === 0);

function setActionFeedback(text: string, isError = false) {
  actionFeedback.value = text;
  actionFeedbackError.value = isError;
}

function toUniqueIds(ids: string[]): string[] {
  return [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
}

function persistUiState() {
  const payload = {
    search: searchQuery.value,
    showHidden: showHidden.value,
    openGroups: openGroupIds.value,
    selection: selection.value,
  };
  localStorage.setItem(UI_STATE_KEY, JSON.stringify(payload));
}

function hydrateUiState() {
  const raw = localStorage.getItem(UI_STATE_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw) as {
      search?: unknown;
      showHidden?: unknown;
      openGroups?: unknown;
      selection?: unknown;
    };

    if (typeof saved.search === "string") searchQuery.value = saved.search;
    if (typeof saved.showHidden === "boolean") showHidden.value = saved.showHidden;
    if (Array.isArray(saved.openGroups)) {
      openGroupIds.value = toUniqueIds(saved.openGroups as string[]);
    }

    const nextSelection = saved.selection as TaxonomySelection | null;
    if (
      nextSelection &&
      typeof nextSelection === "object" &&
      (nextSelection.kind === "group" || nextSelection.kind === "category") &&
      typeof nextSelection.id === "string" &&
      nextSelection.id.trim()
    ) {
      selection.value = { kind: nextSelection.kind, id: nextSelection.id.trim() };
    }
  } catch {
    // Ignore invalid local cache.
  }
}

function setGroupOpen(groupId: string, open: boolean) {
  const id = String(groupId || "").trim();
  if (!id) return;
  const next = new Set(openGroupIds.value);
  if (open) next.add(id);
  else next.delete(id);
  openGroupIds.value = [...next];
}

function syncSelectionAndOpenGroups() {
  selection.value = normalizeTaxonomySelection({
    selection: selection.value,
    groups: groups.value,
    categories: categories.value,
    showHidden: showHidden.value,
    fallbackGroupId: fallbackGroupId.value,
  });

  const visibleGroupIds = new Set(visibleGroups.value.map((group) => group.id));
  openGroupIds.value = toUniqueIds(openGroupIds.value).filter((id) => visibleGroupIds.has(id));

  if (selection.value?.kind === "group") {
    setGroupOpen(selection.value.id, true);
  }

  if (selection.value?.kind === "category") {
    const groupId = categoryById.value.get(selection.value.id)?.groupId;
    if (groupId) setGroupOpen(groupId, true);
  }

  if (openGroupIds.value.length === 0 && fallbackGroupId.value) {
    setGroupOpen(fallbackGroupId.value, true);
  }
}

function syncFormsFromSelection() {
  if (selectedGroup.value) {
    groupFormTitle.value = selectedGroup.value.title || "";
    groupFormOrder.value = Number(selectedGroup.value.order || 0);
    groupFormHidden.value = selectedGroup.value.hidden === true;
  }

  if (selectedCategory.value) {
    categoryFormGroupId.value = selectedCategory.value.groupId || fallbackGroupId.value;
    categoryFormTitle.value = selectedCategory.value.title || "";
    categoryFormOrder.value = Number(selectedCategory.value.order || 0);
    categoryFormHidden.value = selectedCategory.value.hidden === true;
  }
}

function resetCreateCategoryForm() {
  createCategoryId.value = "";
  createCategoryTitle.value = "";
  createCategoryOrder.value = 0;
  createCategoryHidden.value = false;
}

function resetCreateGroupForm() {
  createGroupId.value = "";
  createGroupTitle.value = "";
  createGroupOrder.value = 0;
  createGroupHidden.value = false;
}

function selectGroup(groupId: string, options: { focusCreate?: boolean } = {}) {
  selection.value = { kind: "group", id: groupId };
  setGroupOpen(groupId, true);
  syncFormsFromSelection();
  setActionFeedback("");

  if (options.focusCreate) {
    void nextTick(() => {
      document.querySelector<HTMLInputElement>("#taxonomy-category-create-id")?.focus();
    });
  }
}

function selectCategory(categoryId: string) {
  const category = categoryById.value.get(categoryId);
  if (!category) return;
  selection.value = { kind: "category", id: categoryId };
  setGroupOpen(category.groupId, true);
  syncFormsFromSelection();
  setActionFeedback("");
}

function isGroupOpen(groupId: string): boolean {
  if (searchQuery.value.trim()) return true;
  return openGroupIds.value.includes(groupId);
}

function onToggleGroup(groupId: string, event: Event) {
  if (searchQuery.value.trim()) return;
  const details = event.target as HTMLDetailsElement;
  setGroupOpen(groupId, details.open);
}

function collapseAll() {
  openGroupIds.value = [];
}

function expandAll() {
  const allVisible = buildTaxonomyTree({
    groups: groups.value,
    categories: categories.value,
    search: "",
    showHidden: showHidden.value,
  }).groups;
  openGroupIds.value = allVisible.map((node) => node.group.id);
}

function groupMetaText(node: { group: GroupRow; shownCategories: CategoryRow[] }): string {
  const totalCategories = Number(node.group.categoryCount || 0);
  const shownCategories = node.shownCategories.length;

  const totalItems = Number(node.group.count || 0);
  const shownItems = node.shownCategories.reduce((sum, category) => sum + Number(category.count || 0), 0);

  const categoryText =
    totalCategories && shownCategories !== totalCategories
      ? `分类 ${shownCategories}/${totalCategories}`
      : `分类 ${shownCategories}`;
  const itemText = totalItems && shownItems !== totalItems ? `内容 ${shownItems}/${totalItems}` : `内容 ${totalItems || shownItems}`;

  return `${categoryText} · ${itemText}`;
}

function categoryMetaText(category: CategoryRow): string {
  return `内容 ${Number(category.count || 0)} · 内置 ${Number(category.builtinCount || 0)} · 新增 ${Number(category.dynamicCount || 0)}`;
}

async function reloadTaxonomy() {
  loading.value = true;
  errorText.value = "";

  try {
    const data = await listTaxonomy();
    groups.value = Array.isArray(data?.groups) ? data.groups : [];
    categories.value = Array.isArray(data?.categories) ? data.categories : [];

    syncSelectionAndOpenGroups();
    syncFormsFromSelection();
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "加载分类数据失败。";
  } finally {
    loading.value = false;
  }
}

async function saveGroup() {
  const group = selectedGroup.value;
  if (!group) return;

  if (!groupFormTitle.value.trim()) {
    setActionFeedback("请填写大类标题。", true);
    return;
  }

  saving.value = true;
  errorText.value = "";
  setActionFeedback("");

  try {
    await updateGroup(group.id, {
      title: groupFormTitle.value.trim(),
      order: Number(groupFormOrder.value || 0),
      hidden: groupFormHidden.value,
    });
    await reloadTaxonomy();
    selectGroup(group.id);
    setActionFeedback("大类已保存。");
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "保存大类失败。";
    setActionFeedback(errorText.value, true);
  } finally {
    saving.value = false;
  }
}

async function createGroupEntry() {
  if (!createGroupId.value.trim()) {
    setActionFeedback("请填写大类 ID。", true);
    return;
  }
  if (!createGroupTitle.value.trim()) {
    setActionFeedback("请填写大类标题。", true);
    return;
  }

  saving.value = true;
  errorText.value = "";
  setActionFeedback("");

  try {
    const id = createGroupId.value.trim();
    await createGroup({
      id,
      title: createGroupTitle.value.trim(),
      order: Number(createGroupOrder.value || 0),
      hidden: createGroupHidden.value,
    });
    resetCreateGroupForm();
    await reloadTaxonomy();
    selectGroup(id);
    setActionFeedback("大类已创建。");
  } catch (err) {
    const e = err as { status?: number };
    if (e?.status === 409) {
      errorText.value = "该大类 ID 已存在。";
      setActionFeedback(errorText.value, true);
      return;
    }
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "新增大类失败。";
    setActionFeedback(errorText.value, true);
  } finally {
    saving.value = false;
  }
}

async function resetOrDeleteGroup() {
  const group = selectedGroup.value;
  if (!group) return;

  const isBuiltin = group.id === DEFAULT_GROUP_ID;
  const confirmText = isBuiltin
    ? `确定重置大类「${group.id}」的设置为默认吗？`
    : `确定删除大类「${group.id}」吗？（删除前需先移动/删除其二级分类）`;
  if (!window.confirm(confirmText)) return;

  saving.value = true;
  errorText.value = "";
  setActionFeedback("");

  try {
    await deleteGroup(group.id);
    await reloadTaxonomy();
    setActionFeedback(isBuiltin ? "大类已重置。" : "大类已删除。");
  } catch (err) {
    const e = err as { status?: number; data?: { error?: string } };
    if (e?.data?.error === "group_not_empty") {
      errorText.value = "该大类下仍有二级分类，请先移动/删除二级分类。";
      setActionFeedback(errorText.value, true);
      return;
    }
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : isBuiltin ? "重置大类失败。" : "删除大类失败。";
    setActionFeedback(errorText.value, true);
  } finally {
    saving.value = false;
  }
}

async function createCategoryUnderGroup() {
  const groupId = selectedCreateGroupId.value;
  if (!groupId) return;

  if (!createCategoryId.value.trim()) {
    setActionFeedback("请填写分类 ID。", true);
    return;
  }
  if (!createCategoryTitle.value.trim()) {
    setActionFeedback("请填写分类标题。", true);
    return;
  }

  saving.value = true;
  errorText.value = "";
  setActionFeedback("");

  try {
    const id = createCategoryId.value.trim();
    await createCategory({
      id,
      groupId,
      title: createCategoryTitle.value.trim(),
      order: Number(createCategoryOrder.value || 0),
      hidden: createCategoryHidden.value,
    });

    resetCreateCategoryForm();
    await reloadTaxonomy();
    selectCategory(id);
    setActionFeedback("二级分类已创建。");
  } catch (err) {
    const e = err as { status?: number; data?: { error?: string } };
    if (e?.status === 409) {
      errorText.value = "该分类 ID 已存在。";
      setActionFeedback(errorText.value, true);
      return;
    }
    if (e?.data?.error === "unknown_group") {
      errorText.value = "大类不存在。";
      setActionFeedback(errorText.value, true);
      return;
    }
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "新增分类失败。";
    setActionFeedback(errorText.value, true);
  } finally {
    saving.value = false;
  }
}

async function saveCategory() {
  const category = selectedCategory.value;
  if (!category) return;

  if (!categoryFormTitle.value.trim()) {
    setActionFeedback("请填写分类标题。", true);
    return;
  }

  saving.value = true;
  errorText.value = "";
  setActionFeedback("");

  try {
    await updateCategory(category.id, {
      groupId: categoryFormGroupId.value,
      title: categoryFormTitle.value.trim(),
      order: Number(categoryFormOrder.value || 0),
      hidden: categoryFormHidden.value,
    });
    await reloadTaxonomy();
    selectCategory(category.id);
    setActionFeedback("二级分类已保存。");
  } catch (err) {
    const e = err as { status?: number; data?: { error?: string } };
    if (e?.data?.error === "unknown_group") {
      errorText.value = "大类不存在。";
      setActionFeedback(errorText.value, true);
      return;
    }
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "保存分类失败。";
    setActionFeedback(errorText.value, true);
  } finally {
    saving.value = false;
  }
}

async function resetOrDeleteCategory() {
  const category = selectedCategory.value;
  if (!category) return;

  const canDelete = Number(category.count || 0) === 0;
  const confirmText = canDelete
    ? `确定删除二级分类「${category.id}」吗？`
    : `该二级分类下仍有内容，当前操作只会重置分类设置（标题/排序/隐藏/所属大类），内容不会删除；所属大类将恢复为默认（物理）。确定继续吗？`;
  if (!window.confirm(confirmText)) return;

  saving.value = true;
  errorText.value = "";
  setActionFeedback("");

  try {
    await deleteCategory(category.id);
    await reloadTaxonomy();
    if (canDelete) {
      selectGroup(category.groupId || fallbackGroupId.value);
    } else {
      selectCategory(category.id);
    }
    setActionFeedback(canDelete ? "二级分类已删除。" : "二级分类已重置。");
  } catch (err) {
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : canDelete ? "删除分类失败。" : "重置分类失败。";
    setActionFeedback(errorText.value, true);
  } finally {
    saving.value = false;
  }
}

watch([searchQuery, showHidden], () => {
  syncSelectionAndOpenGroups();
  syncFormsFromSelection();
});

watch(
  [searchQuery, showHidden, openGroupIds, selection],
  () => {
    persistUiState();
  },
  { deep: true },
);

onMounted(async () => {
  hydrateUiState();
  await reloadTaxonomy();
  if (!selection.value && fallbackGroupId.value) {
    selection.value = { kind: "group", id: fallbackGroupId.value };
    syncFormsFromSelection();
  }
});
</script>

<template>
  <section class="admin-taxonomy-view">
    <h2>分类管理</h2>
    <div v-if="errorText" class="error-text">{{ errorText }}</div>

    <div class="toolbar">
      <input
        v-model="searchQuery"
        class="field-input toolbar-search"
        type="search"
        placeholder="搜索大类或分类（标题 / ID）..."
        autocomplete="off"
      />
      <label class="checkbox toolbar-check">
        <input v-model="showHidden" type="checkbox" />
        <span>显示隐藏项</span>
      </label>
      <div class="toolbar-actions">
        <button type="button" class="btn btn-ghost" @click="collapseAll">全部收起</button>
        <button type="button" class="btn btn-ghost" @click="expandAll">全部展开</button>
      </div>
    </div>

    <div class="meta-line">{{ taxonomyMetaText }}</div>

    <div class="layout-grid">
      <div class="panel admin-card">
        <h3>大类 / 分类列表</h3>

        <div v-if="loading" class="empty">加载中...</div>

        <div v-else-if="tree.groups.length === 0" class="empty">
          {{ searchQuery.trim() ? "未找到匹配的分类。" : "暂无大类。" }}
        </div>

        <div v-else class="tree-list">
          <details
            v-for="node in tree.groups"
            :key="node.group.id"
            class="group-block"
            :class="{ selected: selection?.kind === 'group' && selection.id === node.group.id }"
            :open="isGroupOpen(node.group.id)"
            @toggle="onToggleGroup(node.group.id, $event)"
          >
            <summary class="group-summary" @click="selectGroup(node.group.id)">
              <div class="group-main">
                <div class="group-title">
                  {{ node.group.title || node.group.id }} ({{ node.group.id }})
                  <span v-if="showHidden && node.group.hidden" class="tag">隐藏</span>
                </div>
                <div class="group-meta">{{ groupMetaText(node) }}</div>
              </div>
              <button
                type="button"
                class="btn btn-ghost btn-xs"
                @click.stop.prevent="selectGroup(node.group.id, { focusCreate: true })"
              >
                ＋ 二级分类
              </button>
            </summary>

            <div class="category-list">
              <button
                v-for="category in node.shownCategories"
                :key="category.id"
                type="button"
                class="category-item"
                :class="{ selected: selection?.kind === 'category' && selection.id === category.id }"
                @click="selectCategory(category.id)"
              >
                <div class="category-title">
                  {{ category.title || category.id }} ({{ category.id }})
                  <span v-if="showHidden && category.hidden" class="tag">隐藏</span>
                </div>
                <div class="category-meta">{{ categoryMetaText(category) }}</div>
              </button>

              <div v-if="node.shownCategories.length === 0" class="empty-inline">
                {{ searchQuery.trim() ? "未找到匹配的二级分类。" : "暂无二级分类。" }}
              </div>
            </div>
          </details>
        </div>
      </div>

      <div class="panel admin-card">
        <h3>新增大类</h3>
        <div class="form-grid">
          <label class="field">
            <span>大类 ID（英文/数字）</span>
            <input v-model="createGroupId" class="field-input" type="text" />
          </label>

          <label class="field">
            <span>标题</span>
            <input v-model="createGroupTitle" class="field-input" type="text" />
          </label>

          <details class="subaccordion" :open="createGroupHidden || Number(createGroupOrder || 0) !== 0">
            <summary>高级设置</summary>
            <div class="form-grid subaccordion-body">
              <label class="field">
                <span>排序（越大越靠前）</span>
                <input v-model.number="createGroupOrder" class="field-input" type="number" />
              </label>
              <label class="checkbox">
                <input v-model="createGroupHidden" type="checkbox" />
                <span>隐藏该大类（首页不显示）</span>
              </label>
            </div>
          </details>
        </div>

        <div class="actions admin-actions">
          <button type="button" class="btn btn-ghost" :disabled="saving" @click="resetCreateGroupForm">重置</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="createGroupEntry">创建</button>
        </div>

        <div v-if="actionFeedback" class="action-feedback admin-feedback" :class="{ error: actionFeedbackError, success: !actionFeedbackError }">
          {{ actionFeedback }}
        </div>

        <div class="panel-divider" />

        <template v-if="selectedGroup">
          <h3>大类：{{ selectedGroup.title || selectedGroup.id }} ({{ selectedGroup.id }})</h3>
          <div class="meta-line">
            分类 {{ Number(selectedGroup.categoryCount || 0) }} · 内容 {{ Number(selectedGroup.count || 0) }}
          </div>

          <div class="form-grid">
            <label class="field field-span">
              <span>标题</span>
              <input v-model="groupFormTitle" class="field-input" type="text" />
            </label>

            <details class="subaccordion" :open="groupFormHidden || Number(groupFormOrder || 0) !== 0">
              <summary>高级设置</summary>
              <div class="form-grid subaccordion-body">
                <label class="field">
                  <span>排序（越大越靠前）</span>
                  <input v-model.number="groupFormOrder" class="field-input" type="number" />
                </label>
                <label class="checkbox">
                  <input v-model="groupFormHidden" type="checkbox" />
                  <span>隐藏该大类（首页不显示）</span>
                </label>
              </div>
            </details>
          </div>

          <div class="actions admin-actions">
            <button
              type="button"
              class="btn"
              :class="selectedGroup.id === DEFAULT_GROUP_ID ? 'btn-ghost' : 'btn-danger'"
              :disabled="saving"
              @click="resetOrDeleteGroup"
            >
              {{ selectedGroup.id === DEFAULT_GROUP_ID ? "重置" : "删除" }}
            </button>
            <button type="button" class="btn btn-primary" :disabled="saving" @click="saveGroup">保存</button>
          </div>

          <h3>新增二级分类</h3>
          <div class="form-grid">
            <label class="field">
              <span>分类 ID（英文/数字）</span>
              <input id="taxonomy-category-create-id" v-model="createCategoryId" class="field-input" type="text" />
            </label>

            <label class="field">
              <span>标题</span>
              <input v-model="createCategoryTitle" class="field-input" type="text" />
            </label>

            <details class="subaccordion" :open="createCategoryHidden || Number(createCategoryOrder || 0) !== 0">
              <summary>高级设置</summary>
              <div class="form-grid subaccordion-body">
                <label class="field">
                  <span>排序（越大越靠前）</span>
                  <input v-model.number="createCategoryOrder" class="field-input" type="number" />
                </label>
                <label class="checkbox">
                  <input v-model="createCategoryHidden" type="checkbox" />
                  <span>隐藏该分类（首页不显示）</span>
                </label>
              </div>
            </details>
          </div>

          <div class="actions admin-actions">
            <button type="button" class="btn btn-ghost" :disabled="saving" @click="resetCreateCategoryForm">重置</button>
            <button type="button" class="btn btn-primary" :disabled="saving" @click="createCategoryUnderGroup">创建</button>
          </div>
        </template>

        <template v-else-if="selectedCategory">
          <h3>二级分类：{{ selectedCategory.title || selectedCategory.id }} ({{ selectedCategory.id }})</h3>
          <div class="meta-line">
            内容 {{ Number(selectedCategory.count || 0) }} · 内置 {{ Number(selectedCategory.builtinCount || 0) }} · 新增
            {{ Number(selectedCategory.dynamicCount || 0) }}
          </div>

          <div class="form-grid">
            <label class="field">
              <span>大类</span>
              <select v-model="categoryFormGroupId" class="field-input">
                <option v-for="group in allSortedGroups" :key="group.id" :value="group.id">
                  {{ group.title || group.id }} ({{ group.id }})
                </option>
              </select>
            </label>

            <label class="field">
              <span>标题</span>
              <input v-model="categoryFormTitle" class="field-input" type="text" />
            </label>

            <details class="subaccordion" :open="categoryFormHidden || Number(categoryFormOrder || 0) !== 0">
              <summary>高级设置</summary>
              <div class="form-grid subaccordion-body">
                <label class="field">
                  <span>排序（越大越靠前）</span>
                  <input v-model.number="categoryFormOrder" class="field-input" type="number" />
                </label>
                <label class="checkbox">
                  <input v-model="categoryFormHidden" type="checkbox" />
                  <span>隐藏该分类（首页不显示）</span>
                </label>
              </div>
            </details>
          </div>

          <div class="actions admin-actions">
            <button type="button" class="btn" :class="canDeleteSelectedCategory ? 'btn-danger' : 'btn-ghost'" :disabled="saving" @click="resetOrDeleteCategory">
              {{ canDeleteSelectedCategory ? "删除" : "重置" }}
            </button>
            <button type="button" class="btn btn-primary" :disabled="saving" @click="saveCategory">保存</button>
          </div>

          <div class="hint">提示：要新增二级分类，请先在左侧选择对应的大类。</div>
        </template>

        <div v-else class="empty">请选择左侧的大类或二级分类进行编辑。</div>
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
  grid-template-columns: 1.15fr 1fr;
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

.toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto;
  gap: 10px;
  align-items: center;
}

@media (max-width: 960px) {
  .toolbar {
    grid-template-columns: 1fr;
  }
}

.toolbar-search {
  min-width: 0;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.toolbar-check {
  white-space: nowrap;
}

.meta-line {
  color: var(--muted);
  font-size: 12px;
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

.tree-list {
  display: grid;
  gap: 8px;
}

.group-block {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface) 94%, var(--bg));
}

.group-block.selected {
  border-color: color-mix(in srgb, var(--primary) 60%, var(--border));
}

.group-summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
}

.group-summary::-webkit-details-marker {
  display: none;
}

.group-main {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.group-title,
.category-title {
  font-size: 14px;
  font-weight: 600;
}

.group-meta,
.category-meta {
  font-size: 12px;
  color: var(--muted);
}

.category-list {
  display: grid;
  gap: 6px;
  padding: 0 10px 10px;
}

.category-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  display: grid;
  gap: 2px;
  text-align: left;
  background: var(--surface);
  color: inherit;
  cursor: pointer;
}

.category-item.selected {
  border-color: color-mix(in srgb, var(--primary) 60%, var(--border));
  background: color-mix(in srgb, var(--primary) 12%, var(--surface));
}

.tag {
  margin-left: 6px;
  display: inline-block;
  font-size: 11px;
  color: color-mix(in srgb, var(--danger) 70%, var(--text));
}

.form-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.field-span {
  grid-column: 1 / -1;
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}

.subaccordion {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 8px;
}

.subaccordion > summary {
  cursor: pointer;
  color: var(--muted);
  font-size: 13px;
}

.subaccordion-body {
  margin-top: 8px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.panel-divider {
  border-top: 1px dashed var(--border);
  margin-top: 2px;
}

.btn-xs {
  font-size: 12px;
  padding: 4px 8px;
}

.empty,
.empty-inline,
.hint {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 12px;
  color: var(--muted);
  font-size: 13px;
}

.empty-inline {
  border-style: dotted;
  padding: 10px;
}

.error-text {
  color: var(--danger);
  font-size: 13px;
}
</style>
