import { computed, nextTick, onMounted, ref, watch } from "vue";
import {
  createCategory,
  createGroup,
  deleteCategory,
  deleteGroup,
  listTaxonomy,
  updateCategory,
  updateGroup,
} from "../adminApi";
import {
  buildTaxonomyTree,
  normalizeTaxonomySelection,
  sortGroupList,
  type TaxonomyCategory,
  type TaxonomyGroup,
  type TaxonomySelection,
} from "../taxonomyUiState";

const DEFAULT_GROUP_ID = "physics";
const UI_STATE_KEY = "pa_taxonomy_ui";

type GroupRow = TaxonomyGroup;
type CategoryRow = TaxonomyCategory;

export function useTaxonomyAdmin() {
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

  function onToggleGroup(groupId: string, open: boolean) {
    if (searchQuery.value.trim()) return;
    setGroupOpen(groupId, open);
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

  return {
    DEFAULT_GROUP_ID,
    loading,
    saving,
    errorText,
    actionFeedback,
    actionFeedbackError,
    groups,
    categories,
    searchQuery,
    showHidden,
    openGroupIds,
    selection,
    groupFormTitle,
    groupFormOrder,
    groupFormHidden,
    createGroupId,
    createGroupTitle,
    createGroupOrder,
    createGroupHidden,
    createCategoryId,
    createCategoryTitle,
    createCategoryOrder,
    createCategoryHidden,
    categoryFormGroupId,
    categoryFormTitle,
    categoryFormOrder,
    categoryFormHidden,
    tree,
    visibleGroups,
    allSortedGroups,
    selectedGroup,
    selectedCategory,
    selectedCreateGroupId,
    taxonomyMetaText,
    canDeleteSelectedCategory,
    setActionFeedback,
    setGroupOpen,
    syncSelectionAndOpenGroups,
    syncFormsFromSelection,
    resetCreateCategoryForm,
    resetCreateGroupForm,
    selectGroup,
    selectCategory,
    isGroupOpen,
    onToggleGroup,
    collapseAll,
    expandAll,
    groupMetaText,
    categoryMetaText,
    reloadTaxonomy,
    saveGroup,
    createGroupEntry,
    resetOrDeleteGroup,
    createCategoryUnderGroup,
    saveCategory,
    resetOrDeleteCategory,
  };
}
