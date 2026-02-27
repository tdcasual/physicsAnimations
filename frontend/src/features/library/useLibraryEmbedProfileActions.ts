import type { Ref } from "vue";
import {
  createLibraryEmbedProfile,
  deleteLibraryEmbedProfile,
  listLibraryEmbedProfiles,
  syncLibraryEmbedProfile,
  updateLibraryEmbedProfile,
} from "./libraryApi";
import type { JsonObjectParseResult, LibraryPanelTab } from "./libraryAdminModels";
import type { LibraryEmbedProfile } from "./types";

type ParserMode = "auto" | "profile";

interface UseLibraryEmbedProfileActionsDeps {
  savingEmbed: Ref<boolean>;
  embedProfiles: Ref<LibraryEmbedProfile[]>;

  assetEmbedProfileId: Ref<string>;
  assetEditParserMode: Ref<ParserMode>;
  assetEditEmbedProfileId: Ref<string>;

  embedProfileName: Ref<string>;
  embedScriptUrl: Ref<string>;
  embedFallbackScriptUrl: Ref<string>;
  embedViewerPath: Ref<string>;
  embedConstructorName: Ref<string>;
  embedAssetUrlOptionKey: Ref<string>;
  embedExtensionsText: Ref<string>;
  embedDefaultOptionsJson: Ref<string>;
  embedEnabled: Ref<boolean>;

  editingEmbedProfileId: Ref<string>;
  embedEditName: Ref<string>;
  embedEditScriptUrl: Ref<string>;
  embedEditFallbackScriptUrl: Ref<string>;
  embedEditViewerPath: Ref<string>;
  embedEditConstructorName: Ref<string>;
  embedEditAssetUrlOptionKey: Ref<string>;
  embedEditExtensionsText: Ref<string>;
  embedEditDefaultOptionsJson: Ref<string>;
  embedEditEnabled: Ref<boolean>;

  setFeedback: (text: string, isError?: boolean) => void;
  setFieldError: (fieldKey: string, text: string) => void;
  clearFieldErrors: (...fieldKeys: string[]) => void;
  setActivePanelTab: (tab: LibraryPanelTab) => void;
  ensurePanelSectionOpen: (key: string) => void;
  parseJsonObjectInput: (raw: string, fieldLabel: string, fieldKey?: string) => JsonObjectParseResult;
}

export function useLibraryEmbedProfileActions(deps: UseLibraryEmbedProfileActionsDeps) {
  const {
    savingEmbed,
    embedProfiles,
    assetEmbedProfileId,
    assetEditParserMode,
    assetEditEmbedProfileId,
    embedProfileName,
    embedScriptUrl,
    embedFallbackScriptUrl,
    embedViewerPath,
    embedConstructorName,
    embedAssetUrlOptionKey,
    embedExtensionsText,
    embedDefaultOptionsJson,
    embedEnabled,
    editingEmbedProfileId,
    embedEditName,
    embedEditScriptUrl,
    embedEditFallbackScriptUrl,
    embedEditViewerPath,
    embedEditConstructorName,
    embedEditAssetUrlOptionKey,
    embedEditExtensionsText,
    embedEditDefaultOptionsJson,
    embedEditEnabled,
    setFeedback,
    setFieldError,
    clearFieldErrors,
    setActivePanelTab,
    ensurePanelSectionOpen,
    parseJsonObjectInput,
  } = deps;

  function cancelEmbedProfileEdit() {
    editingEmbedProfileId.value = "";
    embedEditName.value = "";
    embedEditScriptUrl.value = "";
    embedEditFallbackScriptUrl.value = "";
    embedEditViewerPath.value = "";
    embedEditConstructorName.value = "ElectricFieldApp";
    embedEditAssetUrlOptionKey.value = "sceneUrl";
    embedEditExtensionsText.value = "";
    embedEditDefaultOptionsJson.value = "{}";
    embedEditEnabled.value = true;
    clearFieldErrors("editEmbedProfileName", "editEmbedScriptUrl", "editEmbedDefaultOptionsJson");
  }

  async function reloadEmbedProfiles() {
    const list = await listLibraryEmbedProfiles();
    embedProfiles.value = list;
    if (!assetEmbedProfileId.value || !list.some((profile) => profile.id === assetEmbedProfileId.value && profile.enabled !== false)) {
      assetEmbedProfileId.value = list.find((profile) => profile.enabled !== false)?.id || "";
    }
    if (
      assetEditParserMode.value === "profile" &&
      (!assetEditEmbedProfileId.value || !list.some((profile) => profile.id === assetEditEmbedProfileId.value && profile.enabled !== false))
    ) {
      assetEditEmbedProfileId.value = list.find((profile) => profile.enabled !== false)?.id || "";
    }
    if (editingEmbedProfileId.value && !list.some((profile) => profile.id === editingEmbedProfileId.value)) {
      cancelEmbedProfileEdit();
    }
  }

  async function createEmbedProfileEntry() {
    clearFieldErrors("createEmbedProfileName", "createEmbedScriptUrl", "createEmbedDefaultOptionsJson");
    const name = embedProfileName.value.trim();
    const scriptUrl = embedScriptUrl.value.trim();
    if (!name) {
      setFieldError("createEmbedProfileName", "请填写 Embed 平台名称。");
      setFeedback("请填写 Embed 平台名称。", true);
      return;
    }
    if (!scriptUrl) {
      setFieldError("createEmbedScriptUrl", "请填写 embed.js 地址。");
      setFeedback("请填写 embed.js 地址。", true);
      return;
    }

    const parsedDefaults = parseJsonObjectInput(embedDefaultOptionsJson.value, "默认参数 JSON", "createEmbedDefaultOptionsJson");
    if (!parsedDefaults.ok) return;

    const matchExtensions = embedExtensionsText.value
      .split(",")
      .map((item) => item.trim().replace(/^\./, "").toLowerCase())
      .filter(Boolean);

    savingEmbed.value = true;
    setFeedback("");
    try {
      await createLibraryEmbedProfile({
        name,
        scriptUrl,
        fallbackScriptUrl: embedFallbackScriptUrl.value.trim(),
        viewerPath: embedViewerPath.value.trim(),
        constructorName: embedConstructorName.value.trim() || "ElectricFieldApp",
        assetUrlOptionKey: embedAssetUrlOptionKey.value.trim() || "sceneUrl",
        matchExtensions,
        defaultOptions: parsedDefaults.value,
        enabled: embedEnabled.value,
      });
      embedProfileName.value = "";
      embedScriptUrl.value = "";
      embedFallbackScriptUrl.value = "";
      embedViewerPath.value = "";
      embedConstructorName.value = "ElectricFieldApp";
      embedAssetUrlOptionKey.value = "sceneUrl";
      embedExtensionsText.value = "";
      embedDefaultOptionsJson.value = "{}";
      embedEnabled.value = true;
      clearFieldErrors("createEmbedProfileName", "createEmbedScriptUrl", "createEmbedDefaultOptionsJson");
      await reloadEmbedProfiles();
      setActivePanelTab("embed");
      setFeedback("Embed 平台已创建。");
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.status === 401) {
        setFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "invalid_profile_script_url") {
        setFeedback("embed.js 地址无效。请使用 / 开头或 http(s) 地址。", true);
        return;
      }
      if (e?.data?.error === "invalid_profile_viewer_path") {
        setFeedback("viewerPath 无效。", true);
        return;
      }
      setFeedback("创建 Embed 平台失败。", true);
    } finally {
      savingEmbed.value = false;
    }
  }

  function startEditEmbedProfile(profile: LibraryEmbedProfile) {
    setActivePanelTab("embed");
    ensurePanelSectionOpen("embed:edit");
    editingEmbedProfileId.value = profile.id;
    embedEditName.value = profile.name || "";
    embedEditScriptUrl.value = profile.remoteScriptUrl || profile.scriptUrl || "";
    embedEditFallbackScriptUrl.value = profile.fallbackScriptUrl || "";
    embedEditViewerPath.value = profile.remoteViewerPath || profile.viewerPath || "";
    embedEditConstructorName.value = profile.constructorName || "ElectricFieldApp";
    embedEditAssetUrlOptionKey.value = profile.assetUrlOptionKey || "sceneUrl";
    embedEditExtensionsText.value = Array.isArray(profile.matchExtensions) ? profile.matchExtensions.join(",") : "";
    embedEditDefaultOptionsJson.value = JSON.stringify(profile.defaultOptions || {}, null, 2);
    embedEditEnabled.value = profile.enabled !== false;
  }

  async function saveEmbedProfileEdit() {
    clearFieldErrors("editEmbedProfileName", "editEmbedScriptUrl", "editEmbedDefaultOptionsJson");
    if (!editingEmbedProfileId.value) return;
    const name = embedEditName.value.trim();
    const scriptUrl = embedEditScriptUrl.value.trim();
    if (!name) {
      setFieldError("editEmbedProfileName", "请填写 Embed 平台名称。");
      setFeedback("请填写 Embed 平台名称。", true);
      return;
    }
    if (!scriptUrl) {
      setFieldError("editEmbedScriptUrl", "请填写 embed.js 地址。");
      setFeedback("请填写 embed.js 地址。", true);
      return;
    }

    const parsedDefaults = parseJsonObjectInput(embedEditDefaultOptionsJson.value, "默认参数 JSON", "editEmbedDefaultOptionsJson");
    if (!parsedDefaults.ok) return;

    const matchExtensions = embedEditExtensionsText.value
      .split(",")
      .map((item) => item.trim().replace(/^\./, "").toLowerCase())
      .filter(Boolean);

    savingEmbed.value = true;
    setFeedback("");
    try {
      await updateLibraryEmbedProfile(editingEmbedProfileId.value, {
        name,
        scriptUrl,
        fallbackScriptUrl: embedEditFallbackScriptUrl.value.trim(),
        viewerPath: embedEditViewerPath.value.trim(),
        constructorName: embedEditConstructorName.value.trim() || "ElectricFieldApp",
        assetUrlOptionKey: embedEditAssetUrlOptionKey.value.trim() || "sceneUrl",
        matchExtensions,
        defaultOptions: parsedDefaults.value,
        enabled: embedEditEnabled.value,
      });
      await reloadEmbedProfiles();
      setActivePanelTab("embed");
      setFeedback("Embed 平台已更新。");
      cancelEmbedProfileEdit();
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.status === 401) {
        setFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "invalid_profile_script_url") {
        setFeedback("embed.js 地址无效。请使用 / 开头或 http(s) 地址。", true);
        return;
      }
      if (e?.data?.error === "invalid_profile_viewer_path") {
        setFeedback("viewerPath 无效。", true);
        return;
      }
      setFeedback("更新 Embed 平台失败。", true);
    } finally {
      savingEmbed.value = false;
    }
  }

  async function removeEmbedProfile(profileId: string) {
    if (!window.confirm("确定删除该 Embed 平台吗？")) return;
    savingEmbed.value = true;
    setFeedback("");
    try {
      await deleteLibraryEmbedProfile(profileId);
      await reloadEmbedProfiles();
      setActivePanelTab("embed");
      setFeedback("Embed 平台已删除。");
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.status === 401) {
        setFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "embed_profile_in_use") {
        setFeedback("该 Embed 平台仍被资源引用，无法删除。", true);
        return;
      }
      setFeedback("删除 Embed 平台失败。", true);
    } finally {
      savingEmbed.value = false;
    }
  }

  async function syncEmbedProfileEntry(profileId: string) {
    savingEmbed.value = true;
    setFeedback("");
    try {
      await syncLibraryEmbedProfile(profileId);
      await reloadEmbedProfiles();
      setActivePanelTab("embed");
      setFeedback("Embed 平台已同步到本地。");
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.status === 401) {
        setFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "embed_profile_sync_failed") {
        setFeedback("同步失败，请检查远端脚本/Viewer 是否可访问。", true);
        return;
      }
      setFeedback("同步 Embed 平台失败。", true);
    } finally {
      savingEmbed.value = false;
    }
  }

  return {
    cancelEmbedProfileEdit,
    reloadEmbedProfiles,
    createEmbedProfileEntry,
    startEditEmbedProfile,
    saveEmbedProfileEdit,
    removeEmbedProfile,
    syncEmbedProfileEntry,
  };
}
