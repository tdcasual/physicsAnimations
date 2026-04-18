import { describe, expect, it } from "vitest";
import { mountVueComponent } from "./helpers/mountVueComponent";
import { useRouteAbortController } from "../src/composables/useRouteAbortController";

describe("useRouteAbortController", () => {
  it("returns an AbortController", async () => {
    let controller!: AbortController;
    const mounted = await mountVueComponent({
      setup() {
        controller = useRouteAbortController();
        return () => null;
      },
    });

    expect(controller).toBeInstanceOf(AbortController);
    expect(controller.signal).toBeInstanceOf(AbortSignal);
    mounted.cleanup();
  });

  it("aborts signal when component unmounts", async () => {
    let controller!: AbortController;
    const mounted = await mountVueComponent({
      setup() {
        controller = useRouteAbortController();
        return () => null;
      },
    });

    expect(controller.signal.aborted).toBe(false);
    mounted.cleanup();
    expect(controller.signal.aborted).toBe(true);
  });
});
