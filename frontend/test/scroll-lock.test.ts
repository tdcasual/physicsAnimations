import { beforeEach, describe, expect, it } from "vitest";
import { useScrollLock } from "../src/composables/useScrollLock";

describe("useScrollLock", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    // Reset module-level lock counter from previous tests
    const { unlock } = useScrollLock();
    for (let i = 0; i < 10; i++) unlock();
  });

  it("locks body scroll", () => {
    const { lock } = useScrollLock();
    lock();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("unlocks body scroll", () => {
    const { lock, unlock } = useScrollLock();
    lock();
    unlock();
    expect(document.body.style.overflow).toBe("");
  });

  it("supports nested lock/unlock", () => {
    const { lock, unlock } = useScrollLock();
    lock();
    lock();
    expect(document.body.style.overflow).toBe("hidden");

    unlock();
    expect(document.body.style.overflow).toBe("hidden");

    unlock();
    expect(document.body.style.overflow).toBe("");
  });

  it("preserves original overflow style", () => {
    document.body.style.overflow = "auto";
    const { lock, unlock } = useScrollLock();
    lock();
    expect(document.body.style.overflow).toBe("hidden");
    unlock();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("does not go negative on excessive unlocks", () => {
    const { unlock } = useScrollLock();
    expect(() => unlock()).not.toThrow();
  });
});
