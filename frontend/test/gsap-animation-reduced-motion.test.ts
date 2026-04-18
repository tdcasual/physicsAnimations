import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountVueComponent } from "./helpers/mountVueComponent";

const mockGsap = {
  fromTo: vi.fn(() => ({ kill: vi.fn() })),
};

const mockInitGsap = vi.fn(async () => ({
  gsap: mockGsap,
  ScrollTrigger: {
    create: vi.fn(() => ({ kill: vi.fn() })),
  },
}));

vi.mock("@/lib/gsap", () => ({
  initGsap: mockInitGsap,
}));

describe("useGsapAnimation reduced motion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockMatchMedia(reduced: boolean) {
    return vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: reduced && query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  it("skips animation factory when prefers-reduced-motion is true", async () => {
    mockMatchMedia(true);
    const factory = vi.fn(() => []);

    const { useGsapAnimation } = await import("../src/composables/useGsapAnimation");
    const mounted = await mountVueComponent({
      setup() {
        useGsapAnimation(factory);
        return () => null;
      },
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(factory).not.toHaveBeenCalled();
    expect(mockInitGsap).not.toHaveBeenCalled();
    mounted.cleanup();
  });

  it("runs animation factory when prefers-reduced-motion is false", async () => {
    mockMatchMedia(false);
    const factory = vi.fn(() => []);

    const { useGsapAnimation } = await import("../src/composables/useGsapAnimation");
    const mounted = await mountVueComponent({
      setup() {
        useGsapAnimation(factory);
        return () => null;
      },
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(mockInitGsap).toHaveBeenCalled();
    expect(factory).toHaveBeenCalledWith(mockGsap);
    mounted.cleanup();
  });

  it("handles single animation result (non-array)", async () => {
    mockMatchMedia(false);
    const tween = { kill: vi.fn() };
    const factory = vi.fn(() => tween as unknown as gsap.core.Tween);

    const { useGsapAnimation } = await import("../src/composables/useGsapAnimation");
    const mounted = await mountVueComponent({
      setup() {
        useGsapAnimation(factory);
        return () => null;
      },
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(factory).toHaveBeenCalled();
    mounted.cleanup();
  });
});
