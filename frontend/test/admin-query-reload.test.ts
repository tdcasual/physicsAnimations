import { nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountVueComponent } from "./helpers/mountVueComponent";
import { useAdminQueryReload } from "../src/features/admin/composables/useAdminQueryReload";

describe("admin query reload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces repeated query changes into a single reload", async () => {
    const reload = vi.fn();
    const query = ref("");

    const mounted = await mountVueComponent({
      setup() {
        useAdminQueryReload({ query, reload, delayMs: 250 });
        return () => null;
      },
    });

    query.value = "mech";
    query.value = "mechanics";
    await nextTick();
    vi.advanceTimersByTime(249);
    expect(reload).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledWith({ reset: true });

    mounted.cleanup();
  });

  it("clears the pending debounce timer on unmount", async () => {
    const reload = vi.fn();
    const query = ref("");

    const mounted = await mountVueComponent({
      setup() {
        useAdminQueryReload({ query, reload, delayMs: 250 });
        return () => null;
      },
    });

    query.value = "waves";
    await nextTick();
    mounted.cleanup();
    vi.runAllTimers();

    expect(reload).not.toHaveBeenCalled();
  });
});
