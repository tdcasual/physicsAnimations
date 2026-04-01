import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyStoredClassroomMode,
  toggleClassroomMode,
} from "../src/features/classroom/classroomMode";

const storage = new Map<string, string>();
const localStorageMock = {
  getItem(key: string) {
    return storage.has(key) ? storage.get(key)! : null;
  },
  setItem(key: string, value: string) {
    storage.set(key, String(value));
  },
  removeItem(key: string) {
    storage.delete(key);
  },
  clear() {
    storage.clear();
  },
};

beforeEach(() => {
  storage.clear();
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
  delete document.documentElement.dataset.classroom;
});

afterEach(() => {
  delete document.documentElement.dataset.classroom;
});

describe("classroom mode persistence", () => {
  it("applies saved classroom mode from localStorage", () => {
    localStorage.setItem("pa_classroom_mode", "on");
    const enabled = applyStoredClassroomMode();
    expect(enabled).toBe(true);
    expect(document.documentElement.dataset.classroom).toBe("on");
  });

  it("toggle switches classroom mode and persists value", () => {
    const nextEnabled = toggleClassroomMode();
    expect(nextEnabled).toBe(true);
    expect(localStorage.getItem("pa_classroom_mode")).toBe("on");
    expect(document.documentElement.dataset.classroom).toBe("on");

    const nextDisabled = toggleClassroomMode();
    expect(nextDisabled).toBe(false);
    expect(localStorage.getItem("pa_classroom_mode")).toBe("off");
    expect(document.documentElement.dataset.classroom).toBeUndefined();
  });
});
