import { describe, expect, it } from "vitest";
import { appRoutes } from "../src/router/routes";

describe("frontend route map", () => {
  it("contains required top-level route entries", () => {
    const topLevelPaths = appRoutes.map((route) => route.path);
    expect(topLevelPaths).toContain("/");
    expect(topLevelPaths).toContain("/viewer/:id");
    expect(topLevelPaths).toContain("/login");
    expect(topLevelPaths).toContain("/admin");
  });

  it("does not keep legacy query-style viewer route", () => {
    const hasLegacyViewerQueryRoute = appRoutes.some((route) => route.name === "viewer-query");
    expect(hasLegacyViewerQueryRoute).toBe(false);
  });

  it("provides admin children routes", () => {
    const admin = appRoutes.find((route) => route.path === "/admin");
    expect(admin).toBeTruthy();
    const children = admin?.children ?? [];
    const childPaths = children.map((route) => route.path);

    expect(childPaths).toContain("dashboard");
    expect(childPaths).toContain("content");
    expect(childPaths).toContain("uploads");
    expect(childPaths).toContain("taxonomy");
    expect(childPaths).toContain("system");
    expect(childPaths).toContain("account");
  });
});
