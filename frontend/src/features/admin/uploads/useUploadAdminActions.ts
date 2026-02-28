import type { Ref } from "vue";
import { deleteAdminItem, listAdminItems, listTaxonomy, updateAdminItem, type AdminItemRow } from "../adminApi";

type GroupRow = {
  id: string;
  title: string;
};

type CategoryRow = {
  id: string;
  groupId: string;
  title: string;
};

type UploadAdminActionParams = {
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  errorText: Ref<string>;
  groups: Ref<GroupRow[]>;
  categories: Ref<CategoryRow[]>;
  items: Ref<AdminItemRow[]>;
  query: Ref<string>;
  categoryId: Ref<string>;
  editCategoryId: Ref<string>;
  editingId: Ref<string>;
  editTitle: Ref<string>;
  editDescription: Ref<string>;
  editOrder: Ref<number>;
  editPublished: Ref<boolean>;
  editHidden: Ref<boolean>;
  page: Ref<number>;
  pageSize: number;
  nextRequestSeq: () => number;
  isLatestRequest: (requestSeq: number) => boolean;
  applyPageResult: (
    payload: { items: AdminItemRow[]; page: number; total: number },
    options: { reset: boolean },
  ) => void;
  syncEditStateWithItems: () => void;
  resetEdit: () => void;
  beginEdit: (item: AdminItemRow) => void;
  setActionFeedback: (text: string, isError?: boolean) => void;
};

function resolveAuthError(status?: number, fallbackText = "操作失败。"): string {
  return status === 401 ? "请先登录管理员账号。" : fallbackText;
}

export function createUploadAdminActions(ctx: UploadAdminActionParams) {
  async function reloadTaxonomy() {
    const data = await listTaxonomy();
    ctx.groups.value = Array.isArray(data?.groups) ? data.groups : [];
    ctx.categories.value = Array.isArray(data?.categories) ? data.categories : [];
    if (!ctx.categories.value.some((row) => row.id === ctx.categoryId.value)) {
      ctx.categoryId.value = ctx.categories.value[0]?.id || "other";
    }
    if (!ctx.categories.value.some((row) => row.id === ctx.editCategoryId.value)) {
      ctx.editCategoryId.value = ctx.categories.value[0]?.id || "other";
    }
  }

  async function reloadUploads(params: { reset: boolean } = { reset: true }) {
    const requestSeq = ctx.nextRequestSeq();
    ctx.loading.value = true;
    ctx.errorText.value = "";

    try {
      const nextPage = params.reset ? 1 : ctx.page.value + 1;
      const data = await listAdminItems({
        page: nextPage,
        pageSize: ctx.pageSize,
        q: ctx.query.value.trim(),
        type: "upload",
      });
      const received = Array.isArray(data?.items) ? data.items : [];
      if (!ctx.isLatestRequest(requestSeq)) return;

      ctx.applyPageResult(
        {
          items: received,
          page: Number(data?.page || nextPage),
          total: Number(data?.total || 0),
        },
        { reset: params.reset },
      );
      ctx.syncEditStateWithItems();
    } catch (err) {
      if (!ctx.isLatestRequest(requestSeq)) return;
      const e = err as { status?: number };
      ctx.errorText.value = resolveAuthError(e?.status, "加载上传列表失败。");
    } finally {
      if (ctx.isLatestRequest(requestSeq)) {
        ctx.loading.value = false;
      }
    }
  }

  async function saveEdit(id: string) {
    ctx.saving.value = true;
    ctx.setActionFeedback("");

    try {
      await updateAdminItem(id, {
        title: ctx.editTitle.value.trim(),
        description: ctx.editDescription.value.trim(),
        categoryId: ctx.editCategoryId.value,
        order: Number(ctx.editOrder.value || 0),
        published: ctx.editPublished.value,
        hidden: ctx.editHidden.value,
      });

      await reloadUploads({ reset: true });
      const updated = ctx.items.value.find((item) => item.id === id);
      if (updated) ctx.beginEdit(updated);
      ctx.setActionFeedback("保存成功。", false);
    } catch (err) {
      const e = err as { status?: number };
      ctx.setActionFeedback(resolveAuthError(e?.status, "保存失败。"), true);
    } finally {
      ctx.saving.value = false;
    }
  }

  async function removeItem(id: string) {
    if (!window.confirm("确定删除该上传内容吗？")) return;
    ctx.saving.value = true;
    ctx.setActionFeedback("");

    try {
      await deleteAdminItem(id);
      if (ctx.editingId.value === id) ctx.resetEdit();
      await reloadUploads({ reset: true });
      ctx.setActionFeedback("上传内容已删除。", false);
    } catch (err) {
      const e = err as { status?: number };
      ctx.setActionFeedback(resolveAuthError(e?.status, "删除失败。"), true);
    } finally {
      ctx.saving.value = false;
    }
  }

  return {
    reloadTaxonomy,
    reloadUploads,
    saveEdit,
    removeItem,
  };
}
