import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { normalizePublicUrl } from "../../catalog/catalogLink";
import {
  type AdminItemRow,
  createLinkItem,
  deleteAdminItem,
  listAdminItems,
  listTaxonomy,
  restoreBuiltinItem,
  updateAdminItem,
} from "../adminApi";
import { useActionFeedback } from "../composables/useActionFeedback";
import { useFieldErrors } from "../composables/useFieldErrors";
import { usePagedAdminList } from "../composables/usePagedAdminList";

interface CategoryRow {
  id: string;
  groupId: string;
  title: string;
}

interface GroupRow {
  id: string;
  title: string;
}

type AdminItem = AdminItemRow;

export function useContentAdmin() {
  const loading = ref(false);
  const saving = ref(false);
  const errorText = ref("");
  const { actionFeedback, actionFeedbackError, setActionFeedback } = useActionFeedback();
  const fieldErrors = ref<Record<string, string>>({});
  const fieldErrorState = useFieldErrors(fieldErrors);
  const { items, total, page, pageSize, hasMore, nextRequestSeq, isLatestRequest, applyPageResult } =
    usePagedAdminList<AdminItem>({ pageSize: 24 });
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

  const selectedItem = computed(() => items.value.find((item) => item.id === editingId.value) || null);

  function viewerHref(id: string): string {
    const base = import.meta.env.BASE_URL || "/";
    return `${base.replace(/\/+$/, "/")}viewer/${encodeURIComponent(id)}`;
  }

  function previewHref(item: AdminItem): string {
    return normalizePublicUrl(item.src || viewerHref(item.id));
  }

  function setFieldError(key: string, message: string) {
    fieldErrorState.setFieldError(key, message);
  }

  function clearFieldErrors(key?: string) {
    fieldErrorState.clearFieldErrors(key);
  }

  function getFieldError(key: string): string {
    return fieldErrorState.getFieldError(key);
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
    if (!currentItem) {
      resetEdit();
    }
  }

  async function reloadTaxonomy() {
    const data = await listTaxonomy();
    groups.value = Array.isArray(data?.groups) ? data.groups : [];
    categories.value = Array.isArray(data?.categories) ? data.categories : [];
    if (!categories.value.some((category) => category.id === linkCategoryId.value)) {
      linkCategoryId.value = categories.value[0]?.id || "other";
    }
    if (!categories.value.some((category) => category.id === editCategoryId.value)) {
      editCategoryId.value = categories.value[0]?.id || "other";
    }
  }

  async function reloadItems(params: { reset: boolean } = { reset: true }) {
    const requestSeq = nextRequestSeq();
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
      if (!isLatestRequest(requestSeq)) return;
      applyPageResult(
        {
          items: received,
          page: Number(data?.page || nextPage),
          total: Number(data?.total || 0),
        },
        { reset: params.reset },
      );
      syncEditStateWithItems();
    } catch (err) {
      if (!isLatestRequest(requestSeq)) return;
      const e = err as { status?: number };
      errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "加载内容失败。";
    } finally {
      if (isLatestRequest(requestSeq)) {
        loading.value = false;
      }
    }
  }

  async function submitLink() {
    const normalizedUrl = linkUrl.value.trim();
    if (!normalizedUrl) {
      setFieldError("createLinkUrl", "请先填写链接地址。");
      return;
    }
    clearFieldErrors("createLinkUrl");

    saving.value = true;
    setActionFeedback("");
    try {
      await createLinkItem({
        url: normalizedUrl,
        categoryId: linkCategoryId.value,
        title: linkTitle.value.trim(),
        description: linkDescription.value.trim(),
      });
      linkUrl.value = "";
      linkTitle.value = "";
      linkDescription.value = "";
      clearFieldErrors("createLinkUrl");
      await reloadItems({ reset: true });
      setActionFeedback("链接已添加。", false);
    } catch (err) {
      const e = err as { status?: number };
      setActionFeedback(e?.status === 401 ? "请先登录管理员账号。" : "新增链接失败。", true);
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
      await reloadItems({ reset: true });
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
    if (!window.confirm("确定删除这条内容吗？")) return;
    saving.value = true;
    setActionFeedback("");
    try {
      await deleteAdminItem(id);
      if (editingId.value === id) resetEdit();
      await reloadItems({ reset: true });
      setActionFeedback("内容已删除。", false);
    } catch (err) {
      const e = err as { status?: number };
      setActionFeedback(e?.status === 401 ? "请先登录管理员账号。" : "删除失败。", true);
    } finally {
      saving.value = false;
    }
  }

  async function restoreItem(id: string) {
    saving.value = true;
    setActionFeedback("");
    try {
      await restoreBuiltinItem(id);
      await reloadItems({ reset: true });
      setActionFeedback("内容已恢复。", false);
    } catch (err) {
      const e = err as { status?: number };
      setActionFeedback(e?.status === 401 ? "请先登录管理员账号。" : "恢复失败。", true);
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

  onBeforeUnmount(() => {
    window.clearTimeout(timer);
  });

  return {
    loading,
    saving,
    errorText,
    actionFeedback,
    actionFeedbackError,
    items,
    total,
    hasMore,
    query,
    groupedCategoryOptions,
    linkCategoryId,
    linkUrl,
    linkTitle,
    linkDescription,
    editingId,
    selectedItem,
    editTitle,
    editDescription,
    editCategoryId,
    editOrder,
    editPublished,
    editHidden,
    previewHref,
    setActionFeedback,
    setFieldError,
    clearFieldErrors,
    getFieldError,
    beginEdit,
    resetEdit,
    reloadItems,
    submitLink,
    saveEdit,
    removeItem,
    restoreItem,
  };
}
