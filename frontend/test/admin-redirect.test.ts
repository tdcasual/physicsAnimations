import { describe, expect, it } from "vitest";
import { resolveAdminRedirect } from "../src/router/redirect";

describe("admin redirect resolver", () => {
  it("falls back to dashboard when redirect is missing or not under /admin", () => {
    expect(resolveAdminRedirect(undefined)).toEqual({ path: "/admin/dashboard" });
    expect(resolveAdminRedirect("")).toEqual({ path: "/admin/dashboard" });
    expect(resolveAdminRedirect("/")).toEqual({ path: "/admin/dashboard" });
    expect(resolveAdminRedirect("/foo/bar")).toEqual({ path: "/admin/dashboard" });
  });

  it("keeps admin path, query and hash", () => {
    expect(resolveAdminRedirect("/admin/content?foo=1#batch")).toEqual({
      path: "/admin/content",
      query: { foo: "1" },
      hash: "#batch",
    });
  });

  it("blocks absolute external redirect strings", () => {
    expect(resolveAdminRedirect("https://example.com/admin/content")).toEqual({
      path: "/admin/dashboard",
    });
  });
});
