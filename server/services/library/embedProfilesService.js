const crypto = require("crypto");
const {
  normalizeUrlLike,
  isAllowedScriptUrl,
  isAllowedViewerPath,
  deriveViewerPath,
  normalizeJsonObject,
  normalizeExtensionList,
  normalizeBoolean,
  normalizeSyncOptions,
  isHttpUrl,
  toPublicPath,
} = require("./core/normalizers");

const RELEASE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/i;

function createEmbedProfilesService({
  store,
  loadLibraryEmbedProfilesState,
  mutateLibraryEmbedProfilesState,
  loadLibraryAssetsState,
  mirrorEmbedProfileResources,
}) {
  async function listEmbedProfiles() {
    const state = await loadLibraryEmbedProfilesState({ store });
    const profiles = Array.isArray(state?.profiles) ? state.profiles : [];
    return profiles.slice();
  }

  async function getEmbedProfileById({ profileId }) {
    const id = String(profileId || "").trim();
    if (!id) return null;
    const profiles = await listEmbedProfiles();
    return profiles.find((profile) => profile.id === id) || null;
  }

  async function createEmbedProfile({
    name,
    scriptUrl,
    fallbackScriptUrl,
    viewerPath,
    constructorName,
    assetUrlOptionKey,
    matchExtensions,
    defaultOptions,
    syncOptions,
    enabled,
  } = {}) {
    const cleanName = String(name || "").trim();
    if (!cleanName) return { status: 400, error: "invalid_profile_name" };
    const cleanScriptUrl = normalizeUrlLike(scriptUrl);
    if (!isAllowedScriptUrl(cleanScriptUrl)) return { status: 400, error: "invalid_profile_script_url" };
    const cleanFallbackScriptUrl = normalizeUrlLike(fallbackScriptUrl);
    if (cleanFallbackScriptUrl && !isAllowedScriptUrl(cleanFallbackScriptUrl)) {
      return { status: 400, error: "invalid_profile_fallback_script_url" };
    }
    const cleanViewerPath = normalizeUrlLike(viewerPath) || deriveViewerPath(cleanScriptUrl) || "viewer.html";
    if (!isAllowedViewerPath(cleanViewerPath)) return { status: 400, error: "invalid_profile_viewer_path" };
    const cleanConstructorName = String(constructorName || "ElectricFieldApp").trim() || "ElectricFieldApp";
    if (!/^[a-z_$][a-z0-9_$.]{0,120}$/i.test(cleanConstructorName)) {
      return { status: 400, error: "invalid_profile_constructor_name" };
    }
    const cleanAssetUrlOptionKey = String(assetUrlOptionKey || "sceneUrl").trim() || "sceneUrl";
    if (!/^[a-z_$][a-z0-9_$]{0,120}$/i.test(cleanAssetUrlOptionKey)) {
      return { status: 400, error: "invalid_profile_asset_option_key" };
    }
    const cleanDefaultOptions = normalizeJsonObject(defaultOptions);
    if (cleanDefaultOptions === null) return { status: 400, error: "invalid_profile_default_options" };
    const cleanExtensions = normalizeExtensionList(matchExtensions);
    const cleanSyncOptions = normalizeSyncOptions(syncOptions, {});
    const cleanEnabled = normalizeBoolean(enabled, true);

    const now = new Date().toISOString();
    const profile = {
      id: `ep_${crypto.randomUUID()}`,
      name: cleanName,
      scriptUrl: cleanScriptUrl,
      fallbackScriptUrl: cleanFallbackScriptUrl,
      viewerPath: cleanViewerPath,
      remoteScriptUrl: cleanScriptUrl,
      remoteViewerPath: cleanViewerPath,
      syncStatus: "pending",
      syncMessage: "",
      lastSyncAt: "",
      constructorName: cleanConstructorName,
      assetUrlOptionKey: cleanAssetUrlOptionKey,
      matchExtensions: cleanExtensions,
      defaultOptions: cleanDefaultOptions,
      syncOptions: cleanSyncOptions,
      syncLastReport: {},
      syncCache: {},
      activeReleaseId: "",
      releaseHistory: [],
      enabled: cleanEnabled,
      createdAt: now,
      updatedAt: now,
    };
    let syncedProfile = profile;
    if (isHttpUrl(profile.remoteScriptUrl) && isHttpUrl(profile.remoteViewerPath)) {
      const mirrored = await mirrorEmbedProfileResources(profile).catch((error) => ({
        ok: false,
        message: error && error.message ? String(error.message) : "sync_failed",
      }));
      syncedProfile = {
        ...profile,
        syncStatus: mirrored.ok ? "ok" : "failed",
        syncMessage: mirrored.ok ? (mirrored.message || "sync_ok") : (mirrored.message || "sync_failed"),
        lastSyncAt: now,
        scriptUrl: mirrored.ok ? mirrored.scriptUrl : profile.scriptUrl,
        viewerPath: mirrored.ok ? mirrored.viewerPath : profile.viewerPath,
        syncLastReport: mirrored.ok ? mirrored.report || {} : {},
        syncCache: mirrored.ok ? mirrored.syncCache || {} : {},
        activeReleaseId: mirrored.ok ? String(mirrored.activeReleaseId || "") : "",
        releaseHistory: mirrored.ok && Array.isArray(mirrored.releaseHistory) ? mirrored.releaseHistory.slice() : [],
      };
    } else {
      syncedProfile = {
        ...profile,
        syncStatus: "ok",
        syncMessage: "local_source",
        lastSyncAt: now,
        syncLastReport: {},
        syncCache: {},
        activeReleaseId: "",
        releaseHistory: [],
      };
    }

    try {
      await mutateLibraryEmbedProfilesState({ store }, (state) => {
        state.profiles.push(syncedProfile);
      });
    } catch (err) {
      await store.deletePath(`library/vendor/embed-profiles/${profile.id}`, { recursive: true }).catch(() => {});
      throw err;
    }

    return { ok: true, profile: syncedProfile };
  }

  async function updateEmbedProfile({
    profileId,
    name,
    scriptUrl,
    fallbackScriptUrl,
    viewerPath,
    constructorName,
    assetUrlOptionKey,
    matchExtensions,
    defaultOptions,
    syncOptions,
    enabled,
  } = {}) {
    const profile = await getEmbedProfileById({ profileId });
    if (!profile) return { status: 404, error: "embed_profile_not_found" };
    let requiresResync = false;

    if (name !== undefined) {
      const cleanName = String(name || "").trim();
      if (!cleanName) return { status: 400, error: "invalid_profile_name" };
      profile.name = cleanName;
    }
    if (scriptUrl !== undefined) {
      const cleanScriptUrl = normalizeUrlLike(scriptUrl);
      if (!isAllowedScriptUrl(cleanScriptUrl)) return { status: 400, error: "invalid_profile_script_url" };
      const previousRemoteScriptUrl = normalizeUrlLike(profile.remoteScriptUrl || profile.scriptUrl);
      profile.remoteScriptUrl = cleanScriptUrl;
      if (cleanScriptUrl !== previousRemoteScriptUrl) {
        profile.scriptUrl = cleanScriptUrl;
        requiresResync = true;
        if (!profile.viewerPath) {
          profile.viewerPath = deriveViewerPath(cleanScriptUrl) || "viewer.html";
        }
      }
    }
    if (fallbackScriptUrl !== undefined) {
      const cleanFallbackScriptUrl = normalizeUrlLike(fallbackScriptUrl);
      if (cleanFallbackScriptUrl && !isAllowedScriptUrl(cleanFallbackScriptUrl)) {
        return { status: 400, error: "invalid_profile_fallback_script_url" };
      }
      profile.fallbackScriptUrl = cleanFallbackScriptUrl;
    }
    if (viewerPath !== undefined) {
      const cleanViewerPath = normalizeUrlLike(viewerPath);
      if (!isAllowedViewerPath(cleanViewerPath)) return { status: 400, error: "invalid_profile_viewer_path" };
      const previousRemoteViewerPath = normalizeUrlLike(
        profile.remoteViewerPath || profile.viewerPath || deriveViewerPath(profile.remoteScriptUrl || profile.scriptUrl),
      );
      profile.remoteViewerPath = cleanViewerPath;
      if (cleanViewerPath !== previousRemoteViewerPath) {
        profile.viewerPath = cleanViewerPath;
        requiresResync = true;
      }
    }
    if (constructorName !== undefined) {
      const cleanConstructorName = String(constructorName || "").trim() || "ElectricFieldApp";
      if (!/^[a-z_$][a-z0-9_$.]{0,120}$/i.test(cleanConstructorName)) {
        return { status: 400, error: "invalid_profile_constructor_name" };
      }
      profile.constructorName = cleanConstructorName;
    }
    if (assetUrlOptionKey !== undefined) {
      const cleanAssetUrlOptionKey = String(assetUrlOptionKey || "").trim() || "sceneUrl";
      if (!/^[a-z_$][a-z0-9_$]{0,120}$/i.test(cleanAssetUrlOptionKey)) {
        return { status: 400, error: "invalid_profile_asset_option_key" };
      }
      profile.assetUrlOptionKey = cleanAssetUrlOptionKey;
    }
    if (matchExtensions !== undefined) {
      profile.matchExtensions = normalizeExtensionList(matchExtensions);
    }
    if (defaultOptions !== undefined) {
      const cleanDefaultOptions = normalizeJsonObject(defaultOptions);
      if (cleanDefaultOptions === null) return { status: 400, error: "invalid_profile_default_options" };
      profile.defaultOptions = cleanDefaultOptions;
    }
    if (syncOptions !== undefined) {
      profile.syncOptions = normalizeSyncOptions(syncOptions, normalizeSyncOptions(profile.syncOptions, {}));
      requiresResync = true;
    }
    if (enabled !== undefined) {
      profile.enabled = normalizeBoolean(enabled, true);
    }
    if (requiresResync) {
      profile.syncStatus = "pending";
      profile.syncMessage = "needs_manual_sync";
    }

    const now = new Date().toISOString();
    let updated = null;
    await mutateLibraryEmbedProfilesState({ store }, (state) => {
      const target = state.profiles.find((item) => item.id === profile.id);
      if (!target) return;
      Object.assign(target, profile, { updatedAt: now });
      updated = { ...target };
    });
    if (!updated) return { status: 404, error: "embed_profile_not_found" };
    return { ok: true, profile: updated };
  }

  async function deleteEmbedProfile({ profileId }) {
    const profile = await getEmbedProfileById({ profileId });
    if (!profile) return { status: 404, error: "embed_profile_not_found" };

    const assetsState = await loadLibraryAssetsState({ store });
    const assets = Array.isArray(assetsState?.assets) ? assetsState.assets : [];
    if (assets.some((asset) => asset.deleted !== true && String(asset.embedProfileId || "") === profile.id)) {
      return { status: 409, error: "embed_profile_in_use" };
    }

    try {
      await store.deletePath(`library/vendor/embed-profiles/${profile.id}`, { recursive: true });
    } catch {
      return { status: 500, error: "embed_profile_cleanup_failed" };
    }

    await mutateLibraryEmbedProfilesState({ store }, (state) => {
      state.profiles = state.profiles.filter((item) => item.id !== profile.id);
    });
    return { ok: true };
  }

  async function rollbackEmbedProfile({ profileId } = {}) {
    const profile = await getEmbedProfileById({ profileId });
    if (!profile) return { status: 404, error: "embed_profile_not_found" };

    const profilePrefix = `library/vendor/embed-profiles/${profile.id}/releases`;
    const history = Array.isArray(profile.releaseHistory)
      ? profile.releaseHistory
          .map((item) => String(item || "").trim())
          .filter((item) => RELEASE_ID_PATTERN.test(item))
      : [];
    const activeReleaseId = String(profile.activeReleaseId || "").trim();
    const previousReleaseId = history.find((item) => item && item !== activeReleaseId) || "";
    if (!previousReleaseId) return { status: 409, error: "embed_profile_no_previous_release" };

    const scriptKey = `${profilePrefix}/${previousReleaseId}/embed.js`;
    const viewerKey = `${profilePrefix}/${previousReleaseId}/viewer.html`;
    const [scriptBuffer, viewerBuffer] = await Promise.all([store.readBuffer(scriptKey), store.readBuffer(viewerKey)]);
    if (!scriptBuffer || !viewerBuffer) return { status: 409, error: "embed_profile_release_not_found" };

    const now = new Date().toISOString();
    const nextHistory = [previousReleaseId, ...history.filter((item) => item !== previousReleaseId)];
    let updated = null;
    await mutateLibraryEmbedProfilesState({ store }, (state) => {
      const target = state.profiles.find((item) => item.id === profile.id);
      if (!target) return;
      target.activeReleaseId = previousReleaseId;
      target.releaseHistory = nextHistory;
      target.scriptUrl = `/${toPublicPath(scriptKey)}`;
      target.viewerPath = `/${toPublicPath(viewerKey)}`;
      target.syncStatus = "ok";
      target.syncMessage = "rollback_ok";
      target.lastSyncAt = now;
      target.updatedAt = now;
      updated = { ...target };
    });
    if (!updated) return { status: 404, error: "embed_profile_not_found" };
    return { ok: true, profile: updated };
  }

  return {
    listEmbedProfiles,
    getEmbedProfileById,
    createEmbedProfile,
    updateEmbedProfile,
    rollbackEmbedProfile,
    deleteEmbedProfile,
  };
}

module.exports = {
  createEmbedProfilesService,
};
