import { describe, expect, it } from "vitest";
import { extractApiError, isApiErrorLike, resolveAuthError } from "../src/features/shared/apiError";

describe("apiError", () => {
  describe("isApiErrorLike", () => {
    it("returns false for primitives", () => {
      expect(isApiErrorLike(null)).toBe(false);
      expect(isApiErrorLike(undefined)).toBe(false);
      expect(isApiErrorLike("error")).toBe(false);
      expect(isApiErrorLike(42)).toBe(false);
    });

    it("returns true for objects with status", () => {
      expect(isApiErrorLike({ status: 500 })).toBe(true);
    });

    it("returns true for objects with data", () => {
      expect(isApiErrorLike({ data: null })).toBe(true);
    });

    it("returns true for objects with message", () => {
      expect(isApiErrorLike({ message: "fail" })).toBe(true);
    });

    it("returns false for plain empty object", () => {
      expect(isApiErrorLike({})).toBe(false);
    });
  });

  describe("extractApiError", () => {
    it("returns the object itself when api-error-like", () => {
      const err = { status: 401, message: "unauthorized" };
      expect(extractApiError(err)).toBe(err);
    });

    it("returns empty object for non-api errors", () => {
      expect(extractApiError("string")).toEqual({});
      expect(extractApiError(null)).toEqual({});
      expect(extractApiError(42)).toEqual({});
      expect(extractApiError({ count: 5 })).toEqual({});
    });
  });

  describe("resolveAuthError", () => {
    it("returns login prompt for 401", () => {
      expect(resolveAuthError(401)).toBe("请先登录管理员账号。");
    });

    it("returns fallback for non-401", () => {
      expect(resolveAuthError(500)).toBe("操作失败。");
      expect(resolveAuthError(undefined)).toBe("操作失败。");
    });

    it("returns custom fallback when provided", () => {
      expect(resolveAuthError(403, "无权限。")).toBe("无权限。");
    });
  });
});
