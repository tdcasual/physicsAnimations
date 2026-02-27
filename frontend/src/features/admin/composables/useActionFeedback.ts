import { ref } from "vue";

export function useActionFeedback() {
  const actionFeedback = ref("");
  const actionFeedbackError = ref(false);

  function setActionFeedback(text: string, isError = false) {
    actionFeedback.value = text;
    actionFeedbackError.value = isError;
  }

  function clearActionFeedback() {
    setActionFeedback("", false);
  }

  return {
    actionFeedback,
    actionFeedbackError,
    setActionFeedback,
    clearActionFeedback,
  };
}
