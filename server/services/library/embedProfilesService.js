const crypto = require("crypto");
const {
  normalizeUrlLike,
  isAllowedScriptUrl,
  isAllowedViewerPath,
  deriveViewerPath,
  normalizeJsonObject,
  normalizeExtensionList,
  normalizeBoolean,
  isHttpUrl,
} = require("./core/normalizers");

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
      syncMode: "local_mirror",
      syncStatus: "pending",
      syncMessage: "",
      lastSyncAt: "",
      constructorName: cleanConstructorName,
      assetUrlOptionKey: cleanAssetUrlOptionKey,
      matchExtensions: cleanExtensions,
      defaultOptions: cleanDefaultOptions,
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
      };
    } else {
      syncedProfile = {
        ...profile,
        syncStatus: "ok",
        syncMessage: "local_source",
        lastSyncAt: now,
      };
    }

    await mutateLibraryEmbedProfilesState({ store }, (state) => {
      state.profiles.push(syncedProfile);
    });

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
      profile.remoteScriptUrl = cleanScriptUrl;
      profile.scriptUrl = cleanScriptUrl;
      requiresResync = true;
      if (!profile.viewerPath) {
        profile.viewerPath = deriveViewerPath(cleanScriptUrl) || "viewer.html";
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
      profile.remoteViewerPath = cleanViewerPath;
      profile.viewerPath = cleanViewerPath;
      requiresResync = true;
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

    await mutateLibraryEmbedProfilesState({ store }, (state) => {
      state.profiles = state.profiles.filter((item) => item.id !== profile.id);
    });
    await store.deletePath(`library/vendor/embed-profiles/${profile.id}`, { recursive: true }).catch(() => {});
    return { ok: true };
  }

  return {
    listEmbedProfiles,
    getEmbedProfileById,
    createEmbedProfile,
    updateEmbedProfile,
    deleteEmbedProfile,
  };
}

module.exports = {
  createEmbedProfilesService,
};
