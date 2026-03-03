import { createMemoryHistory } from "vue-router";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../src/router";

describe("router scroll behavior", () => {
  it("resets scroll to top-left for normal route navigation", async () => {
    const router = createAppRouter({ history: createMemoryHistory("/") });
    const scrollBehavior = router.options.scrollBehavior;
    expect(scrollBehavior).toBeTypeOf("function");

    const position = await scrollBehavior!(
      { path: "/admin/content" } as never,
      { path: "/admin/library" } as never,
      null,
    );

    expect(position).toEqual({ left: 0, top: 0 });
  });

  it("keeps saved scroll position for history navigation", async () => {
    const router = createAppRouter({ history: createMemoryHistory("/") });
    const scrollBehavior = router.options.scrollBehavior;
    expect(scrollBehavior).toBeTypeOf("function");

    const saved = { left: 0, top: 420 };
    const position = await scrollBehavior!(
      { path: "/admin/content" } as never,
      { path: "/admin/library" } as never,
      saved,
    );

    expect(position).toEqual(saved);
  });
});
