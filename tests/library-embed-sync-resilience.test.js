const test = require("node:test");
const assert = require("node:assert/strict");

const { createLibraryService } = require("../server/services/library/libraryService");
const { createMemoryStore } = require("./helpers/libraryServiceFixtures");

function toStorageKeyFromPublicUrl(url) {
  const raw = String(url || "").trim();
  return raw.replace(/^\/+/, "").replace(/^content\//, "");
}

function joinParentPath(storageKey, child) {
  const key = String(storageKey || "").replace(/^\/+/, "");
  const idx = key.lastIndexOf("/");
  if (idx < 0) return String(child || "").replace(/^\/+/, "");
  const parent = key.slice(0, idx);
  return `${parent}/${String(child || "").replace(/^\/+/, "")}`;
}

function makeResponse(body, status = 200, headers = {}) {
  const payload = status === 304 ? null : body;
  return new Response(payload, {
    status,
    headers,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitWithSignal(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

test("atomic publish keeps previous release files when a later sync fails mid-write", async () => {
  const storeBase = createMemoryStore();
  let stage = 1;
  let failDuringSecondSync = false;
  const store = {
    async readBuffer(key) {
      return storeBase.readBuffer(key);
    },
    async deletePath(prefix, options) {
      return storeBase.deletePath(prefix, options);
    },
    async writeBuffer(key, buffer, options) {
      if (failDuringSecondSync && String(key || "").endsWith("/assets/main.css")) {
        throw new Error("simulated_write_failure");
      }
      return storeBase.writeBuffer(key, buffer, options);
    },
  };

  const fetcher = async (url) => {
    const key = String(url || "");
    if (stage === 1) {
      if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript", etag: '"e1"' });
      if (key.endsWith("/embed/viewer.html")) {
        return makeResponse(
          '<!doctype html><html><head><script src="./assets/main.js"></script><link rel="stylesheet" href="./assets/main.css" /></head><body></body></html>',
          200,
          { "content-type": "text/html; charset=utf-8", etag: '"v1"' },
        );
      }
      if (key.endsWith("/embed/assets/main.js")) return makeResponse('import "./v1-only.js";', 200, { "content-type": "application/javascript", etag: '"m1"' });
      if (key.endsWith("/embed/assets/main.css")) return makeResponse("body{color:#111;}", 200, { "content-type": "text/css", etag: '"c1"' });
      if (key.endsWith("/embed/assets/v1-only.js")) return makeResponse('console.log("v1");', 200, { "content-type": "application/javascript", etag: '"d1"' });
      return makeResponse("not found", 404, { "content-type": "text/plain" });
    }

    if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript", etag: '"e2"' });
    if (key.endsWith("/embed/viewer.html")) {
      return makeResponse(
        '<!doctype html><html><head><script src="./assets/main.js"></script><link rel="stylesheet" href="./assets/main.css" /></head><body></body></html>',
        200,
        { "content-type": "text/html; charset=utf-8", etag: '"v2"' },
      );
    }
    if (key.endsWith("/embed/assets/main.js")) return makeResponse('import "./v2-only.js";', 200, { "content-type": "application/javascript", etag: '"m2"' });
    if (key.endsWith("/embed/assets/main.css")) return makeResponse("body{color:#222;}", 200, { "content-type": "text/css", etag: '"c2"' });
    if (key.endsWith("/embed/assets/v2-only.js")) return makeResponse('console.log("v2");', 200, { "content-type": "application/javascript", etag: '"d2"' });
    return makeResponse("not found", 404, { "content-type": "text/plain" });
  };

  const service = createLibraryService({ store, deps: { fetcher } });
  const created = await service.createEmbedProfile({
    name: "Atomic Publish",
    scriptUrl: "https://atomic.infinitas.fun/embed/embed.js",
    viewerPath: "https://atomic.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);

  const oldScriptUrl = created.profile.scriptUrl;
  const oldScriptKey = toStorageKeyFromPublicUrl(oldScriptUrl);
  const oldUniqueKey = joinParentPath(oldScriptKey, "assets/v1-only.js");
  assert.ok(await store.readBuffer(oldUniqueKey));

  stage = 2;
  failDuringSecondSync = true;
  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced?.status, 502);
  assert.equal(synced?.error, "embed_profile_sync_failed");

  const refreshed = await service.getEmbedProfileById({ profileId: created.profile.id });
  assert.equal(refreshed.scriptUrl, oldScriptUrl);
  assert.ok(await store.readBuffer(oldUniqueKey), "previous release file should remain available after failed sync");
});

test("offline self-check fails sync when same-origin local refs remain unresolved", async () => {
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      fetcher: async (url) => {
        const key = String(url || "");
        if (key.endsWith("/embed/embed.js")) return makeResponse("console.log('embed');", 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse(
            '<!doctype html><html><head><script src="./assets/main.js"></script></head><body><img src="./assets/missing.png" /></body></html>',
            200,
            { "content-type": "text/html; charset=utf-8" },
          );
        }
        if (key.endsWith("/embed/assets/main.js")) return makeResponse('console.log("main");', 200, { "content-type": "application/javascript" });
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "Offline Check",
    scriptUrl: "https://offline-check.infinitas.fun/embed/embed.js",
    viewerPath: "https://offline-check.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);

  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced?.status, 502);
  assert.equal(synced?.error, "embed_profile_sync_failed");
});

test("profile syncOptions maxFiles is enforced during sync", async () => {
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      fetcher: async (url) => {
        const key = String(url || "");
        if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse(
            '<!doctype html><html><head><script src="./assets/main.js"></script><link rel="stylesheet" href="./assets/main.css" /></head><body></body></html>',
            200,
            { "content-type": "text/html; charset=utf-8" },
          );
        }
        if (key.endsWith("/embed/assets/main.js")) return makeResponse('console.log("main");', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/assets/main.css")) return makeResponse("body{}", 200, { "content-type": "text/css" });
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "Max Files",
    scriptUrl: "https://limits.infinitas.fun/embed/embed.js",
    viewerPath: "https://limits.infinitas.fun/embed/viewer.html",
    syncOptions: {
      maxFiles: 1,
    },
  });
  assert.equal(created.ok, true);

  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced?.status, 502);
  assert.equal(synced?.error, "embed_profile_sync_failed");
});

test("sync downloads dependencies with configured concurrency > 1", async () => {
  let inFlight = 0;
  let maxObservedInFlight = 0;
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      fetcher: async (url) => {
        const key = String(url || "");
        const slowAsset = /\/embed\/assets\/dep\d+\.js$/.test(key);
        if (slowAsset) {
          inFlight += 1;
          maxObservedInFlight = Math.max(maxObservedInFlight, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 20));
          inFlight -= 1;
        }
        if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse('<!doctype html><html><head><script src="./assets/main.js"></script></head><body></body></html>', 200, {
            "content-type": "text/html; charset=utf-8",
          });
        }
        if (key.endsWith("/embed/assets/main.js")) {
          return makeResponse(
            'import "./dep1.js"; import "./dep2.js"; import "./dep3.js"; import "./dep4.js"; import "./dep5.js";',
            200,
            { "content-type": "application/javascript" },
          );
        }
        if (/\/embed\/assets\/dep\d+\.js$/.test(key)) return makeResponse('console.log("dep");', 200, { "content-type": "application/javascript" });
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "Concurrency",
    scriptUrl: "https://concurrency.infinitas.fun/embed/embed.js",
    viewerPath: "https://concurrency.infinitas.fun/embed/viewer.html",
    syncOptions: {
      concurrency: 4,
    },
  });
  assert.equal(created.ok, true);

  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced.ok, true);
  assert.ok(maxObservedInFlight >= 2, `expected max concurrent fetches >= 2, got ${maxObservedInFlight}`);
});

test("sync report persists observability fields on profile", async () => {
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      fetcher: async (url) => {
        const key = String(url || "");
        if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript", etag: '"e1"' });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse('<!doctype html><html><head><script src="./assets/main.js"></script></head><body></body></html>', 200, {
            "content-type": "text/html; charset=utf-8",
            etag: '"v1"',
          });
        }
        if (key.endsWith("/embed/assets/main.js")) return makeResponse('console.log("main");', 200, { "content-type": "application/javascript", etag: '"m1"' });
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "Report",
    scriptUrl: "https://report.infinitas.fun/embed/embed.js",
    viewerPath: "https://report.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);

  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced.ok, true);

  const refreshed = await service.getEmbedProfileById({ profileId: created.profile.id });
  assert.ok(refreshed.syncLastReport);
  assert.equal(typeof refreshed.syncLastReport.totalUrls, "number");
  assert.equal(typeof refreshed.syncLastReport.fetchedCount, "number");
  assert.equal(typeof refreshed.syncLastReport.durationMs, "number");
  assert.equal(typeof refreshed.syncLastReport.totalBytes, "number");
});

test("incremental sync cache reuses resources through conditional requests", async () => {
  let conditionalHitCount = 0;
  let secondRound = false;
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      fetcher: async (url, options = {}) => {
        const key = String(url || "");
        const headers = options?.headers || {};
        const ifNoneMatch = headers["if-none-match"] || headers["If-None-Match"] || "";
        if (secondRound && ifNoneMatch) {
          conditionalHitCount += 1;
          return makeResponse("", 304, { etag: ifNoneMatch });
        }
        if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript", etag: '"e1"' });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse('<!doctype html><html><head><script src="./assets/main.js"></script></head><body></body></html>', 200, {
            "content-type": "text/html; charset=utf-8",
            etag: '"v1"',
          });
        }
        if (key.endsWith("/embed/assets/main.js")) return makeResponse('console.log("main");', 200, { "content-type": "application/javascript", etag: '"m1"' });
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "Incremental",
    scriptUrl: "https://incremental.infinitas.fun/embed/embed.js",
    viewerPath: "https://incremental.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);

  secondRound = true;
  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced.ok, true);

  const refreshed = await service.getEmbedProfileById({ profileId: created.profile.id });
  assert.ok(conditionalHitCount > 0, "expected conditional request hit count > 0");
  assert.ok(refreshed.syncLastReport.reusedCount > 0, "expected reusedCount > 0");
});

test("inline style refs are mirrored (style tag @import + url)", async () => {
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: {
      fetcher: async (url) => {
        const key = String(url || "");
        if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse(
            '<!doctype html><html><head><script src="./assets/main.js"></script><style>@import "./assets/theme.css"; .hero{background:url("./assets/bg.png");}</style></head><body></body></html>',
            200,
            { "content-type": "text/html; charset=utf-8" },
          );
        }
        if (key.endsWith("/embed/assets/main.js")) return makeResponse('console.log("main");', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/assets/theme.css")) return makeResponse(".hero{color:#333;}", 200, { "content-type": "text/css" });
        if (key.endsWith("/embed/assets/bg.png")) return makeResponse("PNG", 200, { "content-type": "image/png" });
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "Inline Style",
    scriptUrl: "https://inline-style.infinitas.fun/embed/embed.js",
    viewerPath: "https://inline-style.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);

  const refreshed = await service.getEmbedProfileById({ profileId: created.profile.id });
  const scriptKey = toStorageKeyFromPublicUrl(refreshed.scriptUrl);
  const releasePrefix = scriptKey.slice(0, scriptKey.lastIndexOf("/"));
  assert.ok(await store.readBuffer(`${releasePrefix}/assets/theme.css`));
  assert.ok(await store.readBuffer(`${releasePrefix}/assets/bg.png`));
});

test("same profile concurrent sync requests are de-duplicated by in-flight mutex", async () => {
  let phase = 1;
  const phase2CallCounts = new Map();
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      fetcher: async (url, options = {}) => {
        const key = String(url || "");
        if (phase === 2) {
          const count = phase2CallCounts.get(key) || 0;
          phase2CallCounts.set(key, count + 1);
          await waitWithSignal(20, options?.signal);
        }
        if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse('<!doctype html><html><head><script src="./assets/main.js"></script></head><body></body></html>', 200, {
            "content-type": "text/html; charset=utf-8",
          });
        }
        if (key.endsWith("/embed/assets/main.js")) return makeResponse('console.log("main");', 200, { "content-type": "application/javascript" });
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "Concurrent Mutex",
    scriptUrl: "https://mutex.infinitas.fun/embed/embed.js",
    viewerPath: "https://mutex.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);

  phase = 2;
  const [first, second] = await Promise.all([
    service.syncEmbedProfile({ profileId: created.profile.id }),
    service.syncEmbedProfile({ profileId: created.profile.id }),
  ]);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.profile.scriptUrl, second.profile.scriptUrl);
  assert.equal(phase2CallCounts.get("https://mutex.infinitas.fun/embed/embed.js"), 1);
  assert.equal(phase2CallCounts.get("https://mutex.infinitas.fun/embed/viewer.html"), 1);
  assert.equal(phase2CallCounts.get("https://mutex.infinitas.fun/embed/assets/main.js"), 1);
});

test("retry budget recovers transient fetch failures and records retryCount", async () => {
  let phase = 1;
  let phase2MainJsAttempts = 0;
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      fetcher: async (url) => {
        const key = String(url || "");
        if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse('<!doctype html><html><head><script src="./assets/main.js"></script></head><body></body></html>', 200, {
            "content-type": "text/html; charset=utf-8",
          });
        }
        if (key.endsWith("/embed/assets/main.js")) {
          if (phase === 2) {
            phase2MainJsAttempts += 1;
            if (phase2MainJsAttempts === 1) {
              return makeResponse("temporary error", 502, { "content-type": "text/plain" });
            }
          }
          return makeResponse('console.log("main");', 200, { "content-type": "application/javascript" });
        }
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "Retry Budget",
    scriptUrl: "https://retry.infinitas.fun/embed/embed.js",
    viewerPath: "https://retry.infinitas.fun/embed/viewer.html",
    syncOptions: {
      retryMaxAttempts: 3,
      retryBaseDelayMs: 5,
    },
  });
  assert.equal(created.ok, true);

  phase = 2;
  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced.ok, true);
  assert.ok(phase2MainJsAttempts >= 2);
  assert.ok((synced.profile.syncLastReport?.retryCount || 0) > 0);
});

test("syncMessage uses normalized error code and details are recorded in syncLastReport.errors", async () => {
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      fetcher: async (url) => {
        const key = String(url || "");
        if (key.endsWith("/embed/embed.js")) return makeResponse('console.log("embed");', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse('<!doctype html><html><head><script src="./assets/main.js"></script></head><body></body></html>', 200, {
            "content-type": "text/html; charset=utf-8",
          });
        }
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "Taxonomy",
    scriptUrl: "https://taxonomy.infinitas.fun/embed/embed.js",
    viewerPath: "https://taxonomy.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);

  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced?.status, 502);
  const refreshed = await service.getEmbedProfileById({ profileId: created.profile.id });
  assert.equal(refreshed.syncMessage, "required_viewer_dependency_fetch_failed");
  assert.ok(Array.isArray(refreshed.syncLastReport?.errors));
  assert.ok(
    refreshed.syncLastReport.errors.some((item) => item?.code === "required_viewer_dependency_fetch_failed"),
    "expected required_viewer_dependency_fetch_failed in syncLastReport.errors",
  );
});

test("full-graph self-check fails when nested JS dependency remains unresolved", async () => {
  let phase = 1;
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      fetcher: async (url) => {
        const key = String(url || "");
        if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse('<!doctype html><html><head><script src="./assets/main.js"></script></head><body></body></html>', 200, {
            "content-type": "text/html; charset=utf-8",
          });
        }
        if (key.endsWith("/embed/assets/main.js")) return makeResponse('import "./missing.js"; console.log("main");', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/assets/missing.js")) {
          if (phase === 1) return makeResponse('console.log("present");', 200, { "content-type": "application/javascript" });
          return makeResponse("not found", 404, { "content-type": "text/plain" });
        }
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "Graph Self Check",
    scriptUrl: "https://graph-check.infinitas.fun/embed/embed.js",
    viewerPath: "https://graph-check.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);

  phase = 2;
  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced?.status, 502);
  const refreshed = await service.getEmbedProfileById({ profileId: created.profile.id });
  assert.equal(refreshed.syncMessage, "offline_self_check_failed");
});

test("rollback switches profile back to previous release", async () => {
  const store = createMemoryStore();
  let stage = 1;
  const fetcher = async (url) => {
    const key = String(url || "");
    if (key.endsWith("/embed/embed.js")) {
      return makeResponse(stage === 1 ? 'import "./assets/v1.js";' : 'import "./assets/v2.js";', 200, {
        "content-type": "application/javascript",
      });
    }
    if (key.endsWith("/embed/viewer.html")) {
      return makeResponse('<!doctype html><html><head></head><body></body></html>', 200, { "content-type": "text/html; charset=utf-8" });
    }
    if (key.endsWith("/embed/assets/v1.js")) return makeResponse('console.log("v1");', 200, { "content-type": "application/javascript" });
    if (key.endsWith("/embed/assets/v2.js")) return makeResponse('console.log("v2");', 200, { "content-type": "application/javascript" });
    return makeResponse("not found", 404, { "content-type": "text/plain" });
  };
  const service = createLibraryService({ store, deps: { fetcher } });

  const created = await service.createEmbedProfile({
    name: "Rollback",
    scriptUrl: "https://rollback.infinitas.fun/embed/embed.js",
    viewerPath: "https://rollback.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);
  const release1ScriptUrl = created.profile.scriptUrl;

  stage = 2;
  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced.ok, true);
  assert.notEqual(synced.profile.scriptUrl, release1ScriptUrl);

  const rolled = await service.rollbackEmbedProfile({ profileId: created.profile.id });
  assert.equal(rolled.ok, true);
  assert.equal(rolled.profile.scriptUrl, release1ScriptUrl);
});

test("cancel running sync aborts in-flight operation with sync_cancelled message", async () => {
  let phase = 1;
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      fetcher: async (url, options = {}) => {
        const key = String(url || "");
        if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse('<!doctype html><html><head><script src="./assets/main.js"></script></head><body></body></html>', 200, {
            "content-type": "text/html; charset=utf-8",
          });
        }
        if (key.endsWith("/embed/assets/main.js")) {
          if (phase === 2) {
            await waitWithSignal(200, options?.signal);
          }
          return makeResponse('console.log("main");', 200, { "content-type": "application/javascript" });
        }
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "Cancel Sync",
    scriptUrl: "https://cancel.infinitas.fun/embed/embed.js",
    viewerPath: "https://cancel.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);

  phase = 2;
  const syncing = service.syncEmbedProfile({ profileId: created.profile.id });
  await sleep(20);
  const cancelled = await service.cancelEmbedProfileSync({ profileId: created.profile.id });
  assert.equal(cancelled.ok, true);
  const result = await syncing;
  assert.equal(result?.status, 502);

  const refreshed = await service.getEmbedProfileById({ profileId: created.profile.id });
  assert.equal(refreshed.syncMessage, "sync_cancelled");
});

test("unified timeout aborts long-running sync with sync_timeout message", async () => {
  let phase = 1;
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: {
      fetcher: async (url, options = {}) => {
        const key = String(url || "");
        if (phase === 2 && key.endsWith("/embed/assets/main.js")) {
          await waitWithSignal(150, options?.signal);
        }
        if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse('<!doctype html><html><head><script src="./assets/main.js"></script></head><body></body></html>', 200, {
            "content-type": "text/html; charset=utf-8",
          });
        }
        if (key.endsWith("/embed/assets/main.js")) return makeResponse('console.log("main");', 200, { "content-type": "application/javascript" });
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "Timeout Sync",
    scriptUrl: "https://timeout.infinitas.fun/embed/embed.js",
    viewerPath: "https://timeout.infinitas.fun/embed/viewer.html",
    syncOptions: {
      timeoutMs: 50,
    },
  });
  assert.equal(created.ok, true);

  phase = 2;
  const synced = await service.syncEmbedProfile({ profileId: created.profile.id });
  assert.equal(synced?.status, 502);
  const refreshed = await service.getEmbedProfileById({ profileId: created.profile.id });
  assert.equal(refreshed.syncMessage, "sync_timeout");
});

test("JS parser fallback resolves dynamic import with options argument", async () => {
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: {
      fetcher: async (url) => {
        const key = String(url || "");
        if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse('<!doctype html><html><head><script src="./assets/main.js"></script></head><body></body></html>', 200, {
            "content-type": "text/html; charset=utf-8",
          });
        }
        if (key.endsWith("/embed/assets/main.js")) {
          return makeResponse('const dep = import("./dyn.js", { with: { type: "json" } });', 200, {
            "content-type": "application/javascript",
          });
        }
        if (key.endsWith("/embed/assets/dyn.js")) return makeResponse('console.log("dyn");', 200, { "content-type": "application/javascript" });
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "JS Parser Fallback",
    scriptUrl: "https://parser-js.infinitas.fun/embed/embed.js",
    viewerPath: "https://parser-js.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);
  const scriptKey = toStorageKeyFromPublicUrl(created.profile.scriptUrl);
  const releasePrefix = scriptKey.slice(0, scriptKey.lastIndexOf("/"));
  assert.ok(await store.readBuffer(`${releasePrefix}/assets/dyn.js`));
});

test("CSS parser fallback resolves url() refs that include right parenthesis in quoted path", async () => {
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: {
      fetcher: async (url) => {
        const key = String(url || "");
        if (key.endsWith("/embed/embed.js")) return makeResponse('import "./assets/main.js";', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/viewer.html")) {
          return makeResponse(
            '<!doctype html><html><head><script src="./assets/main.js"></script><style>.hero{background:url("./assets/bg(1).png");}</style></head><body></body></html>',
            200,
            { "content-type": "text/html; charset=utf-8" },
          );
        }
        if (key.endsWith("/embed/assets/main.js")) return makeResponse('console.log("main");', 200, { "content-type": "application/javascript" });
        if (key.endsWith("/embed/assets/bg(1).png")) return makeResponse("PNG", 200, { "content-type": "image/png" });
        return makeResponse("not found", 404, { "content-type": "text/plain" });
      },
    },
  });

  const created = await service.createEmbedProfile({
    name: "CSS Parser Fallback",
    scriptUrl: "https://parser-css.infinitas.fun/embed/embed.js",
    viewerPath: "https://parser-css.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created.ok, true);
  const scriptKey = toStorageKeyFromPublicUrl(created.profile.scriptUrl);
  const releasePrefix = scriptKey.slice(0, scriptKey.lastIndexOf("/"));
  assert.ok(await store.readBuffer(`${releasePrefix}/assets/bg(1).png`));
});
