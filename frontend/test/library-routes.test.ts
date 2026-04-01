import { describe, expect, it } from "vitest";
import { appRoutes } from "../src/router/routes";

describe("library route map", () => {
  it("includes public library folder detail route", () => {
    const paths = appRoutes.map((route) => route.path);
    expect(paths).toContain("/library/folder/:id");
  });

  it("includes admin library route", () => {
    const admin = appRoutes.find((route) => route.path === "/admin");
    expect(admin).toBeTruthy();
    const childPaths = (admin?.children ?? []).map((route) => route.path);
    expect(childPaths).toContain("library");
  });
});
