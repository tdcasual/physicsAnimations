import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mountVueComponent } from "./helpers/mountVueComponent";
import { useCatalogSearch, useDebouncedCatalogQuery } from "../src/features/catalog/catalogSearch";

describe("catalogSearch debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset global state
    const q = useCatalogSearch();
    const d = useDebouncedCatalogQuery();
    q.value = "";
    d.value = "";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces query updates by 200ms", async () => {
    const mounted = await mountVueComponent({
      setup() {
        return () => null;
      },
    });

    const catalogQuery = useCatalogSearch();
    const d = useDebouncedCatalogQuery();

    catalogQuery.value = "mech";
    await nextTick();
    expect(d.value).toBe(""); // not yet debounced

    vi.advanceTimersByTime(199);
    expect(d.value).toBe(""); // still not fired

    vi.advanceTimersByTime(1);
    expect(d.value).toBe("mech");

    mounted.cleanup();
  });

  it("cancels previous timer on rapid changes", async () => {
    const catalogQuery = useCatalogSearch();
    const d = useDebouncedCatalogQuery();

    catalogQuery.value = "a";
    await nextTick();
    vi.advanceTimersByTime(100);

    catalogQuery.value = "ab";
    await nextTick();
    vi.advanceTimersByTime(199);
    expect(d.value).not.toBe("ab"); // still not fired

    vi.advanceTimersByTime(1);
    expect(d.value).toBe("ab");
  });

  it("eventually settles to last value", async () => {
    const catalogQuery = useCatalogSearch();
    const d = useDebouncedCatalogQuery();

    catalogQuery.value = "x";
    await nextTick();
    catalogQuery.value = "xy";
    await nextTick();
    catalogQuery.value = "xyz";
    await nextTick();

    vi.advanceTimersByTime(200);
    expect(d.value).toBe("xyz");
  });
});
