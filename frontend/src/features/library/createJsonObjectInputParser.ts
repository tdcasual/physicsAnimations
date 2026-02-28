import type { JsonObjectParseResult } from "./libraryAdminModels";

type JsonObjectInputParserDeps = {
  setFeedback: (message: string, isError?: boolean) => void;
  setFieldError: (field: string, message: string) => void;
};

export function createJsonObjectInputParser(deps: JsonObjectInputParserDeps) {
  return function parseJsonObjectInput(raw: string, fieldLabel: string, fieldKey = ""): JsonObjectParseResult {
    const text = String(raw || "").trim();
    if (!text) return { ok: true, value: {} };
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        if (fieldKey) deps.setFieldError(fieldKey, `${fieldLabel} 需要是对象。`);
        deps.setFeedback(`${fieldLabel} 需要是对象。`, true);
        return { ok: false };
      }
      return { ok: true, value: parsed as Record<string, unknown> };
    } catch {
      if (fieldKey) deps.setFieldError(fieldKey, `${fieldLabel} 格式错误。`);
      deps.setFeedback(`${fieldLabel} 格式错误。`, true);
      return { ok: false };
    }
  };
}
