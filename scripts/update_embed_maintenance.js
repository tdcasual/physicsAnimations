#!/usr/bin/env node
"use strict";

const { createStoreManager } = require("../server/lib/contentStore");
const {
  DEFAULT_EMBED_UPDATER_INTERVAL_DAYS,
  getEmbedUpdaterNextRunAt,
  loadSystemState,
  mutateSystemState,
} = require("../server/lib/systemState");
const { isHttpUrl } = require("../server/services/library/core/normalizers");
const { createLibraryService } = require("../server/services/library/libraryService");
const { DEFAULT_BUNDLE_URL, runUpdate: runGeogebraUpdate } = require("./update_geogebra_bundle");

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function parsePositiveInt(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  const raw = String(value || "").trim();
  if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10);
  return fallback;
}

function createSummaryPatch(summary = {}) {
  return {
    status: typeof summary.status === "string" ? summary.status : "idle",
    ggbStatus: typeof summary.ggbStatus === "string" ? summary.ggbStatus : "",
    totalProfiles: Number.isFinite(summary.totalProfiles) ? Math.max(0, Math.trunc(summary.totalProfiles)) : 0,
    syncedProfiles: Number.isFinite(summary.syncedProfiles) ? Math.max(0, Math.trunc(summary.syncedProfiles)) : 0,
    skippedProfiles: Number.isFinite(summary.skippedProfiles) ? Math.max(0, Math.trunc(summary.skippedProfiles)) : 0,
    failedProfiles: Number.isFinite(summary.failedProfiles) ? Math.max(0, Math.trunc(summary.failedProfiles)) : 0,
  };
}

function isSyncableEmbedProfile(profile) {
  if (!profile || typeof profile !== "object") return false;
  if (profile.enabled === false) return false;
  const scriptUrl = String(profile.remoteScriptUrl || profile.scriptUrl || "").trim();
  const viewerPath = String(profile.remoteViewerPath || profile.viewerPath || "").trim();
  return isHttpUrl(scriptUrl) && isHttpUrl(viewerPath);
}

function shouldRunEmbedUpdater({ embedUpdater, now = new Date() } = {}) {
  const current = embedUpdater && typeof embedUpdater === "object" ? embedUpdater : {};
  if (current.enabled === false) {
    return { shouldRun: false, reason: "disabled", nextRunAt: "" };
  }
  const resolvedNow = toDate(now);
  const nextRunAt = getEmbedUpdaterNextRunAt({
    enabled: current.enabled !== false,
    intervalDays: current.intervalDays ?? DEFAULT_EMBED_UPDATER_INTERVAL_DAYS,
    lastRunAt: current.lastRunAt || "",
    lastSuccessAt: current.lastSuccessAt || "",
    lastError: current.lastError || "",
  });
  if (!nextRunAt) {
    return { shouldRun: true, reason: "due", nextRunAt: "" };
  }
  const nextRun = new Date(nextRunAt);
  if (Number.isNaN(nextRun.getTime()) || resolvedNow.getTime() >= nextRun.getTime()) {
    return { shouldRun: true, reason: "due", nextRunAt };
  }
  return { shouldRun: false, reason: "not_due", nextRunAt };
}

async function persistEmbedUpdaterPatch({ rootDir, mutate = mutateSystemState, patch }) {
  await mutate({ rootDir }, (state) => {
    const current = state.embedUpdater && typeof state.embedUpdater === "object" ? state.embedUpdater : {};
    const currentSummary = current.lastSummary && typeof current.lastSummary === "object" ? current.lastSummary : {};
    state.embedUpdater = {
      ...current,
      ...patch,
      lastSummary: patch.lastSummary
        ? {
            ...currentSummary,
            ...createSummaryPatch(patch.lastSummary),
          }
        : currentSummary,
    };
    return state;
  });
}

function buildGeogebraOptions({ rootDir, env = process.env }) {
  const retain = parsePositiveInt(env.GGB_RETAIN_RELEASES, 3);
  const options = {
    rootDir,
    url: String(env.GGB_BUNDLE_URL || DEFAULT_BUNDLE_URL),
    retain,
  };

  const version = String(env.GGB_BUNDLE_VERSION || "").trim();
  if (version) options.version = version;
  const sha256 = String(env.GGB_BUNDLE_SHA256 || "").trim();
  if (sha256) options.sha256 = sha256;
  const lockFile = String(env.GGB_LOCK_FILE || "").trim();
  if (lockFile) options.lockFile = lockFile;
  if (parseBoolean(env.GGB_BUNDLE_FORCE, false)) options.force = true;
  if (parseBoolean(env.GGB_NO_LOCK, false)) options.noLock = true;
  if (parseBoolean(env.GGB_KEEP_TEMP, false)) options.keepTemp = true;
  return options;
}

function parseCliArgs(argv = process.argv) {
  const args = {
    rootDir: process.cwd(),
    force: false,
    help: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = String(argv[index] || "");
    if (token === "--root") {
      args.rootDir = String(argv[index + 1] || "").trim() || args.rootDir;
      index += 1;
      continue;
    }
    if (token === "--force") {
      args.force = true;
      continue;
    }
    if (token === "--help") {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/update_embed_maintenance.js [options]

Options:
  --root <project-root>     Project root path (default: current working directory)
  --force                   Ignore interval gating and run immediately
  --help                    Show this help
`);
}

async function runEmbedMaintenance({
  rootDir = process.cwd(),
  now = new Date(),
  force = false,
  env = process.env,
  loadSystemState: loadState = loadSystemState,
  mutateSystemState: mutateState = mutateSystemState,
  createStoreManager: createStoreManagerImpl = createStoreManager,
  createLibraryService: createLibraryServiceImpl = createLibraryService,
  runGeogebraUpdate: runGeogebraUpdateImpl = async ({ rootDir: taskRootDir, env: taskEnv }) =>
    runGeogebraUpdate(buildGeogebraOptions({ rootDir: taskRootDir, env: taskEnv })),
} = {}) {
  const resolvedNow = toDate(now);
  const nowIso = resolvedNow.toISOString();
  const state = loadState({ rootDir });
  const embedUpdater = state.embedUpdater || {};
  const decision = force ? { shouldRun: true, reason: "forced", nextRunAt: "" } : shouldRunEmbedUpdater({ embedUpdater, now: resolvedNow });

  if (!decision.shouldRun) {
    await persistEmbedUpdaterPatch({
      rootDir,
      mutate: mutateState,
      patch: {
        lastCheckedAt: nowIso,
        lastSummary: {
          ...embedUpdater.lastSummary,
          status: decision.reason === "disabled" ? "disabled" : "not_due",
        },
      },
    });

    return {
      ok: true,
      status: "skipped",
      reason: decision.reason,
      checkedAt: nowIso,
      nextRunAt: decision.nextRunAt,
      ggbStatus: "skipped",
      totalProfiles: 0,
      syncedProfiles: 0,
      skippedProfiles: 0,
      failedProfiles: 0,
    };
  }

  await persistEmbedUpdaterPatch({
    rootDir,
    mutate: mutateState,
    patch: {
      lastCheckedAt: nowIso,
      lastRunAt: nowIso,
      lastError: "",
      lastSummary: {
        status: "running",
        ggbStatus: "",
        totalProfiles: 0,
        syncedProfiles: 0,
        skippedProfiles: 0,
        failedProfiles: 0,
      },
    },
  });

  let ggbStatus = "skipped";
  let ggbError = "";
  try {
    await runGeogebraUpdateImpl({ rootDir, env });
    ggbStatus = "ok";
  } catch (err) {
    ggbStatus = "failed";
    ggbError = String(err?.message || err || "ggb_update_failed");
  }

  const { store } = createStoreManagerImpl({ rootDir, config: loadState({ rootDir }) });
  const libraryService = createLibraryServiceImpl({ store });
  const listedProfiles = await libraryService.listEmbedProfiles();
  const profiles = Array.isArray(listedProfiles) ? listedProfiles : [];

  let syncedProfiles = 0;
  let skippedProfiles = 0;
  let failedProfiles = 0;

  for (const profile of profiles) {
    if (!isSyncableEmbedProfile(profile)) {
      skippedProfiles += 1;
      continue;
    }
    const result = await libraryService.syncEmbedProfile({ profileId: profile.id, tolerateFailure: true });
    if (result?.ok && result?.profile?.syncStatus === "ok") syncedProfiles += 1;
    else failedProfiles += 1;
  }

  const totalProfiles = profiles.length;
  const partialFailure = ggbStatus === "failed" || failedProfiles > 0;
  const status = partialFailure ? "partial_failure" : "ok";
  const lastError = [ggbError, failedProfiles > 0 ? `${failedProfiles} embed profile(s) failed` : ""]
    .filter(Boolean)
    .join("; ");

  const patch = {
    lastCheckedAt: nowIso,
    lastRunAt: nowIso,
    lastError: partialFailure ? lastError || "embed_maintenance_failed" : "",
    lastSummary: {
      status,
      ggbStatus,
      totalProfiles,
      syncedProfiles,
      skippedProfiles,
      failedProfiles,
    },
  };
  if (!partialFailure) patch.lastSuccessAt = nowIso;

  await persistEmbedUpdaterPatch({ rootDir, mutate: mutateState, patch });

  return {
    ok: !partialFailure,
    status,
    checkedAt: nowIso,
    nextRunAt: getEmbedUpdaterNextRunAt({
      enabled: embedUpdater.enabled !== false,
      intervalDays: embedUpdater.intervalDays ?? DEFAULT_EMBED_UPDATER_INTERVAL_DAYS,
      lastRunAt: nowIso,
      lastSuccessAt: patch.lastSuccessAt || embedUpdater.lastSuccessAt || "",
      lastError: patch.lastError || "",
    }),
    ggbStatus,
    totalProfiles,
    syncedProfiles,
    skippedProfiles,
    failedProfiles,
    lastError: patch.lastError,
  };
}

async function run(argv = process.argv) {
  const args = parseCliArgs(argv);
  if (args.help) {
    printHelp();
    return { ok: true, status: "help" };
  }
  return runEmbedMaintenance({ rootDir: args.rootDir, force: args.force });
}

if (require.main === module) {
  run()
    .then((result) => {
      if (result?.status !== "help") {
        console.log(`[embed-maintenance] ${JSON.stringify(result)}`);
      }
      if (result?.status === "partial_failure" || result?.status === "failed") {
        process.exitCode = 1;
      }
    })
    .catch((err) => {
      console.error(`[embed-maintenance] failed: ${err?.message || err}`);
      process.exitCode = 1;
    });
}

module.exports = {
  buildGeogebraOptions,
  isSyncableEmbedProfile,
  parseCliArgs,
  run,
  runEmbedMaintenance,
  shouldRunEmbedUpdater,
};
