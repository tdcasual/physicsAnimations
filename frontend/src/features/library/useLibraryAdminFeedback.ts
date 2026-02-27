import { computed, ref } from "vue";
import type { OperationLogEntry, OperationLogLevel } from "./libraryAdminModels";

export function useLibraryAdminFeedback() {
  const feedback = ref("");
  const feedbackError = ref(false);
  const fieldErrors = ref<Record<string, string>>({});

  const operationLogs = ref<OperationLogEntry[]>([]);
  const operationLogFilter = ref<"all" | "success" | "error" | "info">("all");

  const filteredOperationLogs = computed(() => {
    if (operationLogFilter.value === "all") return operationLogs.value;
    return operationLogs.value.filter((item) => item.level === operationLogFilter.value);
  });

  function pushOperationLog(message: string, level: OperationLogLevel = "info") {
    const entry: OperationLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      message: String(message || "").trim(),
      level,
      at: new Date().toISOString(),
    };
    if (!entry.message) return;
    operationLogs.value = [entry, ...operationLogs.value].slice(0, 18);
  }

  function setFeedback(text: string, isError = false) {
    feedback.value = text;
    feedbackError.value = isError;
    const clean = String(text || "").trim();
    if (clean) {
      pushOperationLog(clean, isError ? "error" : "success");
    }
  }

  function setFieldError(fieldKey: string, text: string) {
    const key = String(fieldKey || "").trim();
    if (!key) return;
    fieldErrors.value = {
      ...fieldErrors.value,
      [key]: String(text || "").trim(),
    };
  }

  function clearFieldErrors(...fieldKeys: string[]) {
    if (fieldKeys.length === 0) {
      fieldErrors.value = {};
      return;
    }
    const next = { ...fieldErrors.value };
    for (const key of fieldKeys) delete next[key];
    fieldErrors.value = next;
  }

  function getFieldError(fieldKey: string) {
    return String(fieldErrors.value[String(fieldKey || "").trim()] || "");
  }

  function clearOperationLogs() {
    operationLogs.value = [];
  }

  function formatOperationTime(value: string) {
    const date = new Date(String(value || ""));
    const time = date.getTime();
    if (!Number.isFinite(time)) return String(value || "");
    return date.toLocaleString("zh-CN", { hour12: false });
  }

  function getApiErrorCode(err: unknown): string {
    const e = err as { data?: { error?: unknown }; message?: unknown };
    if (typeof e?.data?.error === "string" && e.data.error) return e.data.error;
    if (typeof e?.message === "string" && e.message) return e.message;
    return "unknown_error";
  }

  return {
    feedback,
    feedbackError,
    fieldErrors,
    operationLogs,
    operationLogFilter,
    filteredOperationLogs,
    setFeedback,
    setFieldError,
    clearFieldErrors,
    getFieldError,
    formatOperationTime,
    pushOperationLog,
    clearOperationLogs,
    getApiErrorCode,
  };
}
