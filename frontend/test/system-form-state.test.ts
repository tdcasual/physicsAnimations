import { describe, expect, it } from "vitest";

import {
  buildSystemUpdatePayload,
  canRunManualSync,
  isRemoteMode,
  normalizeUiMode,
  normalizeWebdavBasePath,
  parseTimeoutMs,
  shouldRequireWebdavUrl,
} from "../src/features/admin/systemFormState";

describe("systemFormState", () => {
  it("normalizes storage mode aliases without collapsing webdav to hybrid", () => {
    expect(normalizeUiMode("webdav")).toBe("webdav");
    expect(normalizeUiMode("hybrid")).toBe("hybrid");
    expect(normalizeUiMode("local")).toBe("local");
    expect(normalizeUiMode("local+webdav")).toBe("hybrid");
    expect(normalizeUiMode("mirror")).toBe("hybrid");
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

  it("checks mode requirements and manual sync eligibility", () => {
    expect(isRemoteMode("hybrid")).toBe(true);
    expect(isRemoteMode("webdav")).toBe(true);
    expect(isRemoteMode("local")).toBe(false);

    expect(shouldRequireWebdavUrl("hybrid")).toBe(true);
    expect(shouldRequireWebdavUrl("webdav")).toBe(true);
    expect(shouldRequireWebdavUrl("local")).toBe(false);

    expect(canRunManualSync({ mode: "hybrid", url: "https://dav.example.com" })).toBe(true);
    expect(canRunManualSync({ mode: "webdav", url: "https://dav.example.com" })).toBe(true);
    expect(canRunManualSync({ mode: "webdav", url: "   " })).toBe(false);
    expect(canRunManualSync({ mode: "local", url: "https://dav.example.com" })).toBe(false);
  });
});
