import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { normalizePublicUrl } from "../../catalog/catalogLink";
import {
  type AdminItemRow,
  deleteAdminItem,
  listAdminItems,
  listTaxonomy,
  updateAdminItem,
  uploadHtmlItem,
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

export function useUploadAdmin() {
  const loading = ref(false);
  const saving = ref(false);
  const errorText = ref("");
  const { actionFeedback, actionFeedbackError, setActionFeedback } = useActionFeedback();
  const fieldErrors = ref<Record<string, string>>({});
  const fieldErrorState = useFieldErrors(fieldErrors);
  const { items, total, page, pageSize, hasMore, nextRequestSeq, isLatestRequest, applyPageResult } =
    usePagedAdminList<AdminItem>({ pageSize: 24 });
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

  const selectedItem = computed(() => items.value.find((item) => item.id === editingId.value) || null);
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

  function onSelectFile(nextFile: File | null) {
    file.value = nextFile;
    if (file.value) {
      clearFieldErrors("uploadFile");
    }
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
    const requestSeq = nextRequestSeq();
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
      errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "加载上传列表失败。";
    } finally {
      if (isLatestRequest(requestSeq)) {
        loading.value = false;
      }
    }
  }

  async function submitUpload() {
    if (!file.value) {
      setFieldError("uploadFile", "请选择 HTML 或 ZIP 文件。");
      return;
    }
    clearFieldErrors("uploadFile");
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
      clearFieldErrors("uploadFile");
      await reloadUploads({ reset: true });
      setActionFeedback("上传成功。", false);
    } catch (err) {
      const e = err as { status?: number; data?: any };
      if (e?.status === 401) {
        setActionFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "missing_file") {
        setFieldError("uploadFile", "请选择 HTML 或 ZIP 文件。");
        setActionFeedback("请选择 HTML 或 ZIP 文件。", true);
        return;
      }
      if (e?.data?.error === "invalid_file_type") {
        setFieldError("uploadFile", "仅支持上传 HTML 或 ZIP。");
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
    categoryOptions,
    categoryId,
    file,
    title,
    description,
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
    onSelectFile,
    beginEdit,
    resetEdit,
    reloadUploads,
    submitUpload,
    saveEdit,
    removeItem,
  };
}
