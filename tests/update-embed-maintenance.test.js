const test = require("node:test");
const assert = require("node:assert/strict");

const { runEmbedMaintenance, shouldRunEmbedUpdater } = require("../scripts/update_embed_maintenance");

function makeState(embedUpdater = {}) {
  return {
    version: 1,
    storage: {
      mode: "local",
      lastSyncedAt: "",
      webdav: {
        url: "",
        basePath: "physicsAnimations",
        username: "",
        password: "",
        timeoutMs: 15000,
        scanRemote: false,
      },
    },
    embedUpdater: {
      enabled: true,
      intervalDays: 20,
      lastCheckedAt: "",
      lastRunAt: "",
      lastSuccessAt: "",
      lastError: "",
      lastSummary: {
        status: "idle",
        ggbStatus: "",
        totalProfiles: 0,
        syncedProfiles: 0,
        skippedProfiles: 0,
        failedProfiles: 0,
      },
      ...embedUpdater,
    },
  };
}

function createStateDeps(state) {
  return {
    loadSystemState() {
      return state;
    },
    async mutateSystemState(_params, mutator) {
      return mutator(state);
    },
  };
}

test("shouldRunEmbedUpdater skips when updater is disabled", () => {
  const result = shouldRunEmbedUpdater({
    embedUpdater: makeState({ enabled: false }).embedUpdater,
    now: new Date("2026-03-06T00:00:00.000Z"),
  });

  assert.equal(result.shouldRun, false);
  assert.equal(result.reason, "disabled");
});

test("runEmbedMaintenance skips when interval has not elapsed", async () => {
  const now = new Date("2026-03-06T00:00:00.000Z");
  const state = makeState({
    lastRunAt: "2026-02-25T00:00:00.000Z",
    lastSuccessAt: "2026-02-25T00:00:00.000Z",
    lastSummary: {
      status: "ok",
      ggbStatus: "ok",
      totalProfiles: 2,
      syncedProfiles: 2,
      skippedProfiles: 0,
      failedProfiles: 0,
    },
  });
  const deps = createStateDeps(state);
  let geogebraCalls = 0;
  let syncCalls = 0;

  const result = await runEmbedMaintenance({
    rootDir: "/tmp/pa",
    now,
    ...deps,
    runGeogebraUpdate: async () => {
      geogebraCalls += 1;
      return { version: "unused" };
    },
    createStoreManager: () => ({ store: {} }),
    createLibraryService: () => ({
      listEmbedProfiles: async () => [],
      syncEmbedProfile: async () => {
        syncCalls += 1;
        return { ok: true, profile: { syncStatus: "ok" } };
      },
    }),
  });

  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "not_due");
  assert.equal(geogebraCalls, 0);
  assert.equal(syncCalls, 0);
  assert.equal(state.embedUpdater.lastCheckedAt, now.toISOString());
});

test("runEmbedMaintenance updates geogebra and syncs eligible remote profiles when due", async () => {
  const now = new Date("2026-03-06T00:00:00.000Z");
  const state = makeState({
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastSuccessAt: "2026-01-01T00:00:00.000Z",
  });
  const deps = createStateDeps(state);
  const syncedIds = [];

  const result = await runEmbedMaintenance({
    rootDir: "/tmp/pa",
    now,
    ...deps,
    runGeogebraUpdate: async () => ({ version: "release-1" }),
    createStoreManager: () => ({ store: {} }),
    createLibraryService: () => ({
      listEmbedProfiles: async () => [
        {
          id: "ep_remote",
          enabled: true,
          remoteScriptUrl: "https://example.com/embed.js",
          remoteViewerPath: "https://example.com/viewer.html",
        },
        {
          id: "ep_local",
          enabled: true,
          scriptUrl: "/content/library/vendor/custom/embed.js",
          viewerPath: "/content/library/vendor/custom/viewer.html",
        },
        {
          id: "ep_disabled",
          enabled: false,
          remoteScriptUrl: "https://example.com/disabled.js",
          remoteViewerPath: "https://example.com/disabled.html",
        },
      ],
      syncEmbedProfile: async ({ profileId }) => {
        syncedIds.push(profileId);
        return { ok: true, profile: { id: profileId, syncStatus: "ok" } };
      },
    }),
  });

  assert.equal(result.status, "ok");
  assert.equal(result.ggbStatus, "ok");
  assert.equal(result.totalProfiles, 3);
  assert.equal(result.syncedProfiles, 1);
  assert.equal(result.skippedProfiles, 2);
  assert.equal(result.failedProfiles, 0);
  assert.deepEqual(syncedIds, ["ep_remote"]);
  assert.equal(state.embedUpdater.lastRunAt, now.toISOString());
  assert.equal(state.embedUpdater.lastSuccessAt, now.toISOString());
  assert.equal(state.embedUpdater.lastError, "");
  assert.equal(state.embedUpdater.lastSummary.status, "ok");
});

test("runEmbedMaintenance records partial failures without aborting the whole batch", async () => {
  const now = new Date("2026-03-06T00:00:00.000Z");
  const state = makeState({
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastSuccessAt: "2026-01-01T00:00:00.000Z",
  });
  const deps = createStateDeps(state);

  const result = await runEmbedMaintenance({
    rootDir: "/tmp/pa",
    now,
    ...deps,
    runGeogebraUpdate: async () => {
      throw new Error("ggb_failed");
    },
    createStoreManager: () => ({ store: {} }),
    createLibraryService: () => ({
      listEmbedProfiles: async () => [
        {
          id: "ep_remote",
          enabled: true,
          remoteScriptUrl: "https://example.com/embed.js",
          remoteViewerPath: "https://example.com/viewer.html",
        },
      ],
      syncEmbedProfile: async () => ({ ok: true, profile: { syncStatus: "failed" } }),
    }),
  });

  assert.equal(result.status, "partial_failure");
  assert.equal(result.ggbStatus, "failed");
  assert.equal(result.syncedProfiles, 0);
  assert.equal(result.failedProfiles, 1);
  assert.match(state.embedUpdater.lastError, /ggb_failed/);
  assert.equal(state.embedUpdater.lastSummary.status, "partial_failure");
  assert.equal(state.embedUpdater.lastSuccessAt, "2026-01-01T00:00:00.000Z");
});
