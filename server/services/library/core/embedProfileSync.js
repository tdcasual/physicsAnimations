const { deriveViewerPath, isHttpUrl } = require("./normalizers");
const { createMirrorEmbedProfileResources } = require("./sync/mirrorResources");
const {
  RELEASE_ID_PATTERN,
  normalizeSyncCode,
  sanitizeReleaseHistory,
  sanitizeSyncCache,
  createSyncError,
} = require("./sync/syncCommon");

function createEmbedProfileSync({ store, fetcher, getEmbedProfileById, mutateLibraryEmbedProfilesState }) {
  const inFlightByProfile = new Map();
  const mirrorEmbedProfileResources = createMirrorEmbedProfileResources({
    store,
    fetcher,
  });

  async function applyEmbedProfileSyncStatus({
    profileId,
    syncStatus,
    syncMessage,
    scriptUrl,
    viewerPath,
    activeReleaseId,
    releaseHistory,
    syncCache,
    syncLastReport,
  }) {
    const now = new Date().toISOString();
    let updated = null;
    await mutateLibraryEmbedProfilesState({ store }, (state) => {
      const target = state.profiles.find((item) => item.id === profileId);
      if (!target) return;
      target.syncStatus = String(syncStatus || "").trim() || "pending";
      target.syncMessage = normalizeSyncCode(syncMessage || "sync_failed", "sync_failed");
      target.lastSyncAt = now;
      if (scriptUrl) target.scriptUrl = scriptUrl;
      if (viewerPath) target.viewerPath = viewerPath;
      if (activeReleaseId !== undefined) {
        const value = String(activeReleaseId || "").trim();
        target.activeReleaseId = RELEASE_ID_PATTERN.test(value) ? value : "";
      }
      if (releaseHistory !== undefined) {
        target.releaseHistory = sanitizeReleaseHistory(releaseHistory);
      }
      if (syncCache !== undefined) {
        target.syncCache = sanitizeSyncCache(syncCache);
      }
      if (syncLastReport !== undefined) {
        target.syncLastReport =
          syncLastReport && typeof syncLastReport === "object" && !Array.isArray(syncLastReport) ? syncLastReport : {};
      }
      target.updatedAt = now;
      updated = { ...target };
    });
    return updated;
  }

  async function runSyncEmbedProfile({ profileId, tolerateFailure = false, signal = null } = {}) {
    const profile = await getEmbedProfileById({ profileId });
    if (!profile) return { status: 404, error: "embed_profile_not_found" };
    if (!isHttpUrl(profile.remoteScriptUrl || profile.scriptUrl)) {
      return { status: 400, error: "invalid_profile_script_url" };
    }
    if (!isHttpUrl(profile.remoteViewerPath || profile.viewerPath || deriveViewerPath(profile.remoteScriptUrl || profile.scriptUrl))) {
      return { status: 400, error: "invalid_profile_viewer_path" };
    }

    try {
      const mirrored = await mirrorEmbedProfileResources(profile, { signal });
      if (!mirrored.ok) {
        const updated = await applyEmbedProfileSyncStatus({
          profileId: profile.id,
          syncStatus: "failed",
          syncMessage: mirrored.message || "sync_failed",
          syncLastReport: mirrored.report || {},
        });
        if (tolerateFailure) return { ok: true, profile: updated || profile };
        return { status: 502, error: "embed_profile_sync_failed" };
      }
      const updated = await applyEmbedProfileSyncStatus({
        profileId: profile.id,
        syncStatus: "ok",
        syncMessage: mirrored.message || "sync_ok",
        scriptUrl: mirrored.scriptUrl,
        viewerPath: mirrored.viewerPath,
        activeReleaseId: mirrored.activeReleaseId,
        releaseHistory: mirrored.releaseHistory,
        syncCache: mirrored.syncCache,
        syncLastReport: mirrored.report,
      });
      if (!updated) return { status: 404, error: "embed_profile_not_found" };
      return { ok: true, profile: updated };
    } catch (err) {
      const code = normalizeSyncCode(err?.syncCode || err?.message || "sync_failed", "sync_failed");
      await applyEmbedProfileSyncStatus({
        profileId: profile.id,
        syncStatus: "failed",
        syncMessage: code,
        syncLastReport:
          err && err.syncReport && typeof err.syncReport === "object" && !Array.isArray(err.syncReport)
            ? err.syncReport
            : undefined,
      }).catch(() => {});
      if (tolerateFailure) {
        const refreshed = await getEmbedProfileById({ profileId: profile.id });
        return { ok: true, profile: refreshed || profile };
      }
      return { status: 502, error: "embed_profile_sync_failed" };
    }
  }

  async function syncEmbedProfile({ profileId, tolerateFailure = false } = {}) {
    const normalizedProfileId = String(profileId || "").trim();
    if (!normalizedProfileId) return { status: 404, error: "embed_profile_not_found" };
    const existing = inFlightByProfile.get(normalizedProfileId);
    if (existing && existing.promise) {
      return existing.promise;
    }

    const controller = new AbortController();
    const promise = runSyncEmbedProfile({
      profileId: normalizedProfileId,
      tolerateFailure,
      signal: controller.signal,
    }).finally(() => {
      const current = inFlightByProfile.get(normalizedProfileId);
      if (current && current.promise === promise) {
        inFlightByProfile.delete(normalizedProfileId);
      }
    });

    inFlightByProfile.set(normalizedProfileId, {
      controller,
      promise,
    });
    return promise;
  }

  async function cancelEmbedProfileSync({ profileId } = {}) {
    const normalizedProfileId = String(profileId || "").trim();
    if (!normalizedProfileId) return { status: 404, error: "embed_profile_not_found" };
    const entry = inFlightByProfile.get(normalizedProfileId);
    if (!entry || !entry.controller) {
      return { status: 409, error: "embed_profile_sync_not_running" };
    }
    entry.controller.abort(createSyncError({ code: "sync_cancelled", detail: "cancel_requested" }));
    return { ok: true, cancelled: true };
  }

  return {
    mirrorEmbedProfileResources,
    applyEmbedProfileSyncStatus,
    syncEmbedProfile,
    cancelEmbedProfileSync,
  };
}

module.exports = {
  createEmbedProfileSync,
};
