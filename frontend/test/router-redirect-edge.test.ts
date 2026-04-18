import { describe, expect, it } from "vitest";
import { resolveAdminRedirect } from "../src/router/redirect";

describe("resolveAdminRedirect edge cases", () => {
  it("rejects non-admin paths", () => {
    expect(resolveAdminRedirect("/viewer/123")).toEqual({ path: "/admin/dashboard" });
    expect(resolveAdminRedirect("https://evil.com/admin/dashboard")).toEqual({
      path: "/admin/dashboard",
    });
  });

  it("handles empty redirect", () => {
    expect(resolveAdminRedirect("")).toEqual({ path: "/admin/dashboard" });
    expect(resolveAdminRedirect(null as unknown)).toEqual({ path: "/admin/dashboard" });
  });

  it("preserves simple admin path", () => {
    expect(resolveAdminRedirect("/admin/content")).toEqual({ path: "/admin/content" });
  });

  it("preserves query string", () => {
    expect(resolveAdminRedirect("/admin/content?tab=drafts")).toEqual({
      path: "/admin/content",
      query: { tab: "drafts" },
    });
  });

  it("preserves hash", () => {
    expect(resolveAdminRedirect("/admin/content#section2")).toEqual({
      path: "/admin/content",
      hash: "#section2",
    });
  });

  it("preserves query and hash together", () => {
    expect(resolveAdminRedirect("/admin/content?tab=drafts#section2")).toEqual({
      path: "/admin/content",
      query: { tab: "drafts" },
      hash: "#section2",
    });
  });

  it("handles root admin path", () => {
    expect(resolveAdminRedirect("/admin")).toEqual({ path: "/admin" });
  });

  it("falls back on malformed URL", () => {
    expect(resolveAdminRedirect("http://[bad")).toEqual({ path: "/admin/dashboard" });
  });
});
