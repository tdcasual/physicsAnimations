import { computed, onMounted, ref } from "vue";
import { buildPreviewHref } from "../adminLinks";
import { type AdminItemRow, uploadHtmlItem } from "../adminApi";
import { createAdminItemEditorState } from "../composables/useAdminItemEditorState";
import { useActionFeedback } from "../composables/useActionFeedback";
import { useFieldErrors } from "../composables/useFieldErrors";
import { usePagedAdminList } from "../composables/usePagedAdminList";
import { usePendingChangesGuard } from "../composables/usePendingChangesGuard";
import { useAdminQueryReload } from "../composables/useAdminQueryReload";
import { createUploadAdminActions } from "./useUploadAdminActions";
import { extractApiError } from "../../shared/apiError";

interface CategoryRow { id: string; groupId: string; title: string; }
interface GroupRow { id: string; title: string; }
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
  const groups = ref<GroupRow[]>([]), categories = ref<CategoryRow[]>([]);
  const categoryId = ref("other"), file = ref<File | null>(null), title = ref(""), description = ref("");
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
  const categoryOptions = computed(() => {
    const groupMap = new Map(groups.value.map((group) => [group.id, group.title]));
    return categories.value.map((category) => ({
      value: category.id,
      label: `${groupMap.get(category.groupId) || category.groupId} / ${category.title}`,
    }));
  });

  function previewHref(item: AdminItem): string { return buildPreviewHref(item); }

  interface RiskFinding {
    severity?: string;
    message?: string;
    source?: string;
  }
  interface RiskDetails {
    findings?: RiskFinding[];
    truncated?: boolean;
    summary?: string;
  }
  function buildRiskConfirmMessage(details: RiskDetails): string {
    const findings = Array.isArray(details?.findings) ? details.findings : [];
    if (findings.length === 0) return "检测到潜在风险内容，确认后继续上传。是否继续？";
    const lines = findings.slice(0, 6).map((item: RiskFinding, index: number) => {
      const severity = String(item?.severity || "unknown");
      const message = String(item?.message || "潜在风险");
      const source = item?.source ? ` (${String(item.source)})` : "";
      return `${index + 1}. [${severity}] ${message}${source}`;
    });
    const truncated = details?.truncated ? "\n...（仅展示部分风险项）" : "";
    const summary = typeof details?.summary === "string" && details.summary ? details.summary : `检测到 ${findings.length} 项潜在风险特征。`;
    return `${summary}\n\n${lines.join("\n")}${truncated}\n\n是否仍继续上传？`;
  }

  function onSelectFile(nextFile: File | null) {
    file.value = nextFile;
    if (file.value) clearFieldErrors("uploadFile");
  }

  const { reloadTaxonomy, reloadUploads, saveEdit, removeItem } = createUploadAdminActions({
    loading,
    saving,
    errorText,
    groups,
    categories,
    items,
    query,
    categoryId,
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
    setActionFeedback,
    setFieldError,
    clearFieldErrors,
  });

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
      let created: Record<string, unknown> | undefined;

      try {
        created = await uploadHtmlItem(basePayload);
      } catch (err) {
        const e = extractApiError(err);
        if (e.data?.error !== "risky_html_requires_confirmation") throw err;

        const confirmed = window.confirm(buildRiskConfirmMessage((e.data?.details as Record<string, unknown>) ?? {}));
        if (!confirmed) {
          setActionFeedback("已取消风险上传。", true);
          return;
        }
        created = await uploadHtmlItem({ ...basePayload, allowRiskyHtml: true });
      }

      file.value = null;
      title.value = "";
      description.value = "";
      clearFieldErrors("uploadFile");
      await reloadUploads({ reset: true });

      const warnings = Array.isArray(created?.warnings) ? created.warnings : [];
      const thumbnailWarning = warnings.find((warning: { code?: string }) => warning?.code === "thumbnail_capture_failed");
      if (thumbnailWarning) {
        setActionFeedback("上传成功，但封面生成失败，可稍后重试。", false);
        return;
      }
      setActionFeedback("上传成功。", false);
    } catch (err) {
      const e = extractApiError(err);
      if (e.status === 401) return void setActionFeedback("请先登录管理员账号。", true);
      if (e.data?.error === "missing_file") {
        setFieldError("uploadFile", "请选择 HTML 或 ZIP 文件。");
        setActionFeedback("请选择 HTML 或 ZIP 文件。", true);
        return;
      }
      if (e.data?.error === "invalid_file_type") {
        setFieldError("uploadFile", "仅支持上传 HTML 或 ZIP。");
        setActionFeedback("仅支持上传 HTML 或 ZIP。", true);
        return;
      }
      setActionFeedback("上传失败。", true);
    } finally {
      saving.value = false;
    }
  }

  usePendingChangesGuard({ hasPendingChanges: hasPendingEditChanges, isBlocked: saving, message: "当前编辑内容有未保存更改，确定离开当前页面吗？" });
  useAdminQueryReload({ query, reload: reloadUploads });
  onMounted(async () => { await reloadTaxonomy().catch(() => {}); await reloadUploads({ reset: true }); });

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
