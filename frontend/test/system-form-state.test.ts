import { describe, expect, it } from "vitest";

import {
  buildSystemUpdatePayload,
  normalizeUiMode,
  normalizeWebdavBasePath,
  parseTimeoutMs,
  shouldAutoEnableSyncOnSave,
  shouldRequireWebdavUrl,
} from "../src/features/admin/systemFormState";

describe("systemFormState", () => {
  it("maps storage mode webdav to hybrid in UI", () => {
    expect(normalizeUiMode("webdav")).toBe("hybrid");
    expect(normalizeUiMode("hybrid")).toBe("hybrid");
    expect(normalizeUiMode("local")).toBe("local");
    expect(normalizeUiMode("")).toBe("local");
  });

  it("normalizes webdav base path with fallback", () => {
    expect(normalizeWebdavBasePath("  ")).toBe("physicsAnimations");
    expect(normalizeWebdavBasePath(" my/base ")).toBe("my/base");
  });

  it("parses timeout only when finite integer", () => {
    expect(parseTimeoutMs("15000")).toBe(15000);
    expect(parseTimeoutMs(" 2000 ")).toBe(2000);
    expect(parseTimeoutMs("")).toBeUndefined();
    expect(parseTimeoutMs("abc")).toBeUndefined();
  });

  it("buildSystemUpdatePayload includes optional fields only when provided", () => {
    const payload = buildSystemUpdatePayload({
      mode: "hybrid",
      url: " https://dav.example.com/root/ ",
      basePath: "  ",
      username: " user1 ",
      password: "",
      timeoutRaw: "",
      scanRemote: true,
      sync: false,
    });

    expect(payload).toEqual({
      mode: "hybrid",
      sync: false,
      webdav: {
        url: "https://dav.example.com/root/",
        basePath: "physicsAnimations",
        username: "user1",
        scanRemote: true,
      },
    });
  });

  it("buildSystemUpdatePayload keeps password and timeout when valid", () => {
    const payload = buildSystemUpdatePayload({
      mode: "webdav",
      url: "https://dav.example.com/root/",
      basePath: "physicsAnimations",
      username: "user1",
      password: "secret",
      timeoutRaw: "30000",
      scanRemote: false,
      sync: true,
    });

    expect(payload.webdav.password).toBe("secret");
    expect(payload.webdav.timeoutMs).toBe(30000);
  });

  it("checks mode requirements and sync-on-save auto rule", () => {
    expect(shouldRequireWebdavUrl("hybrid")).toBe(true);
    expect(shouldRequireWebdavUrl("webdav")).toBe(true);
    expect(shouldRequireWebdavUrl("local")).toBe(false);

    expect(shouldAutoEnableSyncOnSave({ loadedMode: "local", nextMode: "hybrid" })).toBe(true);
    expect(shouldAutoEnableSyncOnSave({ loadedMode: "hybrid", nextMode: "hybrid" })).toBe(false);
    expect(shouldAutoEnableSyncOnSave({ loadedMode: "local", nextMode: "local" })).toBe(false);
  });
});
