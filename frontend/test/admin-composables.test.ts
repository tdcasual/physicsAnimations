import { describe, expect, it } from "vitest";
import { useActionFeedback } from "../src/features/admin/composables/useActionFeedback";
import { useFieldErrors } from "../src/features/admin/composables/useFieldErrors";
import { usePagedAdminList } from "../src/features/admin/composables/usePagedAdminList";

describe("admin composables", () => {
  it("useFieldErrors supports set/get/clear flows", () => {
    const { fieldErrors, setFieldError, clearFieldErrors, getFieldError } = useFieldErrors();

    expect(fieldErrors.value).toEqual({});
    expect(getFieldError("uploadFile")).toBe("");

    setFieldError("uploadFile", "请选择文件");
    expect(getFieldError("uploadFile")).toBe("请选择文件");

    clearFieldErrors("uploadFile");
    expect(getFieldError("uploadFile")).toBe("");
  });

  it("useActionFeedback tracks error and success states", () => {
    const { actionFeedback, actionFeedbackError, setActionFeedback, clearActionFeedback } = useActionFeedback();

    setActionFeedback("保存失败", true);
    expect(actionFeedback.value).toBe("保存失败");
    expect(actionFeedbackError.value).toBe(true);

    setActionFeedback("保存成功");
    expect(actionFeedback.value).toBe("保存成功");
    expect(actionFeedbackError.value).toBe(false);

    clearActionFeedback();
    expect(actionFeedback.value).toBe("");
    expect(actionFeedbackError.value).toBe(false);
  });

  it("usePagedAdminList ignores stale request updates and appends by mode", () => {
    const state = usePagedAdminList<{ id: string }>({ pageSize: 2 });

    const req1 = state.nextRequestSeq();
    const req2 = state.nextRequestSeq();
    expect(state.isLatestRequest(req1)).toBe(false);
    expect(state.isLatestRequest(req2)).toBe(true);

    state.applyPageResult(
      {
        items: [{ id: "a" }],
        page: 1,
        total: 3,
      },
      { reset: true },
    );
    expect(state.items.value.map((item) => item.id)).toEqual(["a"]);
    expect(state.hasMore.value).toBe(true);

    state.applyPageResult(
      {
        items: [{ id: "b" }],
        page: 2,
        total: 3,
      },
      { reset: false },
    );
    expect(state.items.value.map((item) => item.id)).toEqual(["a", "b"]);
  });
});
