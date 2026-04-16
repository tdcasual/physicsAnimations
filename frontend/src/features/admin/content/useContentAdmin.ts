import { computed, onMounted, ref } from "vue";
import { buildPreviewHref, buildViewerHref } from "../adminLinks";
import { type AdminItemRow, createLinkItem } from "../adminApi";
import { createAdminItemEditorState } from "../composables/useAdminItemEditorState";
import { useActionFeedback } from "../composables/useActionFeedback";
import { useFieldErrors } from "../composables/useFieldErrors";
import { usePagedAdminList } from "../composables/usePagedAdminList";
import { usePendingChangesGuard } from "../composables/usePendingChangesGuard";
import { useAdminQueryReload } from "../composables/useAdminQueryReload";
import { createContentAdminActions } from "./useContentAdminActions";

interface CategoryRow { id: string; groupId: string; title: string; }
interface GroupRow { id: string; title: string; }
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
  const categories = ref<CategoryRow[]>([]), groups = ref<GroupRow[]>([]);
  const linkCategoryId = ref("other"), linkUrl = ref(""), linkTitle = ref(""), linkDescription = ref("");
  function setFieldError(key: string, message: string) { fieldErrorState.setFieldError(key, message); }
  function clearFieldErrors(key?: string) { fieldErrorState.clearFieldErrors(key); }
  function getFieldError(key: string): string { return fieldErrorState.getFieldError(key); }
  const {
    editingId,
    editTitle,
    editDescription,
    editCategoryId,
    editOrder,
    editPublished,
    editHidden,
    selectedItem,
    hasPendingEditChanges,
    beginEdit,
    resetEdit,
    syncEditStateWithItems,
  } = createAdminItemEditorState<AdminItem>({
    items,
    defaultCategoryId: "other",
    clearFieldErrors,
    setActionFeedback,
  });
  const groupedCategoryOptions = computed(() => {
    const groupsMap = new Map(groups.value.map((group) => [group.id, group.title]));
    return categories.value.map((category) => ({
      value: category.id,
      label: `${groupsMap.get(category.groupId) || category.groupId} / ${category.title}`,
    }));
  });

  function viewerHref(id: string): string { return buildViewerHref(id); }
  function previewHref(item: AdminItem): string { return buildPreviewHref(item); }

  const { reloadTaxonomy, reloadItems, saveEdit, removeItem } = createContentAdminActions({
    loading,
    saving,
    errorText,
    groups,
    categories,
    items,
    query,
    linkCategoryId,
    editCategoryId,
    editingId,
    editTitle,
    editDescription,
    editOrder,
    editPublished,
    editHidden,
    page,
    pageSize,
    nextRequestSeq,
    isLatestRequest,
    applyPageResult,
    syncEditStateWithItems,
    resetEdit,
    beginEdit,
    setFieldError,
    clearFieldErrors,
    setActionFeedback,
  });

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
      const created = await createLinkItem({
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
      const warnings = Array.isArray(created?.warnings) ? created.warnings : [];
      const thumbnailWarning = warnings.find((warning: { code?: string }) => warning?.code === "thumbnail_capture_failed");
      if (thumbnailWarning) {
        setActionFeedback("链接已添加，但封面生成失败，可稍后重试。", false);
        return;
      }
      setActionFeedback("链接已添加。", false);
    } catch (err) {
      const e = err as { status?: number };
      setActionFeedback(e?.status === 401 ? "请先登录管理员账号。" : "新增链接失败。", true);
    } finally {
      saving.value = false;
    }
  }

  usePendingChangesGuard({ hasPendingChanges: hasPendingEditChanges, isBlocked: saving, message: "当前编辑内容有未保存更改，确定离开当前页面吗？" });
  useAdminQueryReload({ query, reload: reloadItems });
  onMounted(async () => { await reloadTaxonomy().catch(() => {}); await reloadItems({ reset: true }); });

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
  };
}
