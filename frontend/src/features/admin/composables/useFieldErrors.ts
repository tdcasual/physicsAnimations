import { ref, type Ref } from "vue";

export function useFieldErrors(externalFieldErrors?: Ref<Record<string, string>>) {
  const fieldErrors = externalFieldErrors || ref<Record<string, string>>({});

  function setFieldError(key: string, message: string) {
    fieldErrors.value = {
      ...fieldErrors.value,
      [key]: message,
    };
  }

  function clearFieldErrors(key?: string) {
    if (!key) {
      fieldErrors.value = {};
      return;
    }
    if (!(key in fieldErrors.value)) return;
    const next = { ...fieldErrors.value };
    delete next[key];
    fieldErrors.value = next;
  }

  function getFieldError(key: string): string {
    return fieldErrors.value[key] || "";
  }

  return {
    fieldErrors,
    setFieldError,
    clearFieldErrors,
    getFieldError,
  };
}
