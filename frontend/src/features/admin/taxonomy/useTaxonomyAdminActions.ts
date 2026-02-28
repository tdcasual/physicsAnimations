import type { ComputedRef, Ref } from "vue";
import {
  createCategory,
  createGroup,
  deleteCategory,
  deleteGroup,
  listTaxonomy,
  updateCategory,
  updateGroup,
} from "../adminApi";
import type { TaxonomyCategory, TaxonomyGroup } from "../taxonomyUiState";

type GroupRow = TaxonomyGroup;
type CategoryRow = TaxonomyCategory;

type TaxonomyAdminActionsParams = {
  defaultGroupId: string;
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  errorText: Ref<string>;
  groups: Ref<GroupRow[]>;
  categories: Ref<CategoryRow[]>;
  selectedGroup: ComputedRef<GroupRow | null>;
  selectedCategory: ComputedRef<CategoryRow | null>;
  selectedCreateGroupId: ComputedRef<string>;
  fallbackGroupId: ComputedRef<string>;
  groupFormTitle: Ref<string>;
  groupFormOrder: Ref<number>;
  groupFormHidden: Ref<boolean>;
  createGroupId: Ref<string>;
  createGroupTitle: Ref<string>;
  createGroupOrder: Ref<number>;
  createGroupHidden: Ref<boolean>;
  createCategoryId: Ref<string>;
  createCategoryTitle: Ref<string>;
  createCategoryOrder: Ref<number>;
  createCategoryHidden: Ref<boolean>;
  categoryFormGroupId: Ref<string>;
  categoryFormTitle: Ref<string>;
  categoryFormOrder: Ref<number>;
  categoryFormHidden: Ref<boolean>;
  setActionFeedback: (text: string, isError?: boolean) => void;
  syncSelectionAndOpenGroups: () => void;
  syncFormsFromSelection: () => void;
  resetCreateCategoryForm: () => void;
  resetCreateGroupForm: () => void;
  selectGroup: (groupId: string) => void;
  selectCategory: (categoryId: string) => void;
};

function resolveAuthError(status?: number, fallbackText = "操作失败。"): string {
  return status === 401 ? "请先登录管理员账号。" : fallbackText;
}

export function createTaxonomyAdminActions(ctx: TaxonomyAdminActionsParams) {
  async function reloadTaxonomy() {
    ctx.loading.value = true;
    ctx.errorText.value = "";

    try {
      const data = await listTaxonomy();
      ctx.groups.value = Array.isArray(data?.groups) ? data.groups : [];
      ctx.categories.value = Array.isArray(data?.categories) ? data.categories : [];

      ctx.syncSelectionAndOpenGroups();
      ctx.syncFormsFromSelection();
    } catch (err) {
      const e = err as { status?: number };
      ctx.errorText.value = resolveAuthError(e?.status, "加载分类数据失败。");
    } finally {
      ctx.loading.value = false;
    }
  }

  async function saveGroup() {
    const group = ctx.selectedGroup.value;
    if (!group) return;

    if (!ctx.groupFormTitle.value.trim()) {
      ctx.setActionFeedback("请填写大类标题。", true);
      return;
    }

    ctx.saving.value = true;
    ctx.errorText.value = "";
    ctx.setActionFeedback("");

    try {
      await updateGroup(group.id, {
        title: ctx.groupFormTitle.value.trim(),
        order: Number(ctx.groupFormOrder.value || 0),
        hidden: ctx.groupFormHidden.value,
      });
      await reloadTaxonomy();
      ctx.selectGroup(group.id);
      ctx.setActionFeedback("大类已保存。");
    } catch (err) {
      const e = err as { status?: number };
      ctx.errorText.value = resolveAuthError(e?.status, "保存大类失败。");
      ctx.setActionFeedback(ctx.errorText.value, true);
    } finally {
      ctx.saving.value = false;
    }
  }

  async function createGroupEntry() {
    if (!ctx.createGroupId.value.trim()) {
      ctx.setActionFeedback("请填写大类 ID。", true);
      return;
    }
    if (!ctx.createGroupTitle.value.trim()) {
      ctx.setActionFeedback("请填写大类标题。", true);
      return;
    }

    ctx.saving.value = true;
    ctx.errorText.value = "";
    ctx.setActionFeedback("");

    try {
      const id = ctx.createGroupId.value.trim();
      await createGroup({
        id,
        title: ctx.createGroupTitle.value.trim(),
        order: Number(ctx.createGroupOrder.value || 0),
        hidden: ctx.createGroupHidden.value,
      });
      ctx.resetCreateGroupForm();
      await reloadTaxonomy();
      ctx.selectGroup(id);
      ctx.setActionFeedback("大类已创建。");
    } catch (err) {
      const e = err as { status?: number };
      if (e?.status === 409) {
        ctx.errorText.value = "该大类 ID 已存在。";
        ctx.setActionFeedback(ctx.errorText.value, true);
        return;
      }
      ctx.errorText.value = resolveAuthError(e?.status, "新增大类失败。");
      ctx.setActionFeedback(ctx.errorText.value, true);
    } finally {
      ctx.saving.value = false;
    }
  }

  async function resetOrDeleteGroup() {
    const group = ctx.selectedGroup.value;
    if (!group) return;

    const isBuiltin = group.id === ctx.defaultGroupId;
    const confirmText = isBuiltin
      ? `确定重置大类「${group.id}」的设置为默认吗？`
      : `确定删除大类「${group.id}」吗？（删除前需先移动/删除其二级分类）`;
    if (!window.confirm(confirmText)) return;

    ctx.saving.value = true;
    ctx.errorText.value = "";
    ctx.setActionFeedback("");

    try {
      await deleteGroup(group.id);
      await reloadTaxonomy();
      ctx.setActionFeedback(isBuiltin ? "大类已重置。" : "大类已删除。");
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.data?.error === "group_not_empty") {
        ctx.errorText.value = "该大类下仍有二级分类，请先移动/删除二级分类。";
        ctx.setActionFeedback(ctx.errorText.value, true);
        return;
      }
      ctx.errorText.value = resolveAuthError(e?.status, isBuiltin ? "重置大类失败。" : "删除大类失败。");
      ctx.setActionFeedback(ctx.errorText.value, true);
    } finally {
      ctx.saving.value = false;
    }
  }

  async function createCategoryUnderGroup() {
    const groupId = ctx.selectedCreateGroupId.value;
    if (!groupId) return;

    if (!ctx.createCategoryId.value.trim()) {
      ctx.setActionFeedback("请填写分类 ID。", true);
      return;
    }
    if (!ctx.createCategoryTitle.value.trim()) {
      ctx.setActionFeedback("请填写分类标题。", true);
      return;
    }

    ctx.saving.value = true;
    ctx.errorText.value = "";
    ctx.setActionFeedback("");

    try {
      const id = ctx.createCategoryId.value.trim();
      await createCategory({
        id,
        groupId,
        title: ctx.createCategoryTitle.value.trim(),
        order: Number(ctx.createCategoryOrder.value || 0),
        hidden: ctx.createCategoryHidden.value,
      });
      ctx.resetCreateCategoryForm();
      await reloadTaxonomy();
      ctx.selectCategory(id);
      ctx.setActionFeedback("二级分类已创建。");
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.status === 409) {
        ctx.errorText.value = "该分类 ID 已存在。";
        ctx.setActionFeedback(ctx.errorText.value, true);
        return;
      }
      if (e?.data?.error === "unknown_group") {
        ctx.errorText.value = "大类不存在。";
        ctx.setActionFeedback(ctx.errorText.value, true);
        return;
      }
      ctx.errorText.value = resolveAuthError(e?.status, "新增分类失败。");
      ctx.setActionFeedback(ctx.errorText.value, true);
    } finally {
      ctx.saving.value = false;
    }
  }

  async function saveCategory() {
    const category = ctx.selectedCategory.value;
    if (!category) return;

    if (!ctx.categoryFormTitle.value.trim()) {
      ctx.setActionFeedback("请填写分类标题。", true);
      return;
    }

    ctx.saving.value = true;
    ctx.errorText.value = "";
    ctx.setActionFeedback("");

    try {
      await updateCategory(category.id, {
        groupId: ctx.categoryFormGroupId.value,
        title: ctx.categoryFormTitle.value.trim(),
        order: Number(ctx.categoryFormOrder.value || 0),
        hidden: ctx.categoryFormHidden.value,
      });
      await reloadTaxonomy();
      ctx.selectCategory(category.id);
      ctx.setActionFeedback("二级分类已保存。");
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.data?.error === "unknown_group") {
        ctx.errorText.value = "大类不存在。";
        ctx.setActionFeedback(ctx.errorText.value, true);
        return;
      }
      ctx.errorText.value = resolveAuthError(e?.status, "保存分类失败。");
      ctx.setActionFeedback(ctx.errorText.value, true);
    } finally {
      ctx.saving.value = false;
    }
  }

  async function resetOrDeleteCategory() {
    const category = ctx.selectedCategory.value;
    if (!category) return;

    const canDelete = Number(category.count || 0) === 0;
    const confirmText = canDelete
      ? `确定删除二级分类「${category.id}」吗？`
      : "该二级分类下仍有内容，当前操作只会重置分类设置（标题/排序/隐藏/所属大类），内容不会删除；所属大类将恢复为默认（物理）。确定继续吗？";
    if (!window.confirm(confirmText)) return;

    ctx.saving.value = true;
    ctx.errorText.value = "";
    ctx.setActionFeedback("");

    try {
      await deleteCategory(category.id);
      await reloadTaxonomy();
      if (canDelete) {
        ctx.selectGroup(category.groupId || ctx.fallbackGroupId.value);
      } else {
        ctx.selectCategory(category.id);
      }
      ctx.setActionFeedback(canDelete ? "二级分类已删除。" : "二级分类已重置。");
    } catch (err) {
      const e = err as { status?: number };
      ctx.errorText.value = resolveAuthError(e?.status, canDelete ? "删除分类失败。" : "重置分类失败。");
      ctx.setActionFeedback(ctx.errorText.value, true);
    } finally {
      ctx.saving.value = false;
    }
  }

  return {
    reloadTaxonomy,
    saveGroup,
    createGroupEntry,
    resetOrDeleteGroup,
    createCategoryUnderGroup,
    saveCategory,
    resetOrDeleteCategory,
  };
}
