import type { Ref } from "vue";
import { updateLibraryAsset } from "./libraryApi";
import type { JsonObjectParseResult, LibraryPanelTab } from "./libraryAdminModels";
import type { LibraryAsset, LibraryOpenMode } from "./types";

type UseLibraryAssetEditorActionsDeps = {
  savingAsset: Ref<boolean>;
  selectedFolderId: Ref<string>;
  editingAssetId: Ref<string>;
  assetEditDisplayName: Ref<string>;
  assetEditFolderId: Ref<string>;
  assetEditOpenMode: Ref<LibraryOpenMode>;
  assetEditParserMode: Ref<"auto" | "profile">;
  assetEditEmbedProfileId: Ref<string>;
  assetEditEmbedOptionsJson: Ref<string>;
  reloadFolders: () => Promise<void>;
  reloadFolderAssets: () => Promise<void>;
  setActivePanelTab: (tab: LibraryPanelTab) => void;
  ensurePanelSectionOpen: (key: string) => void;
  setFeedback: (message: string, isError?: boolean) => void;
  setFieldError: (key: string, message: string) => void;
  clearFieldErrors: (...keys: string[]) => void;
  parseJsonObjectInput: (raw: string, fieldLabel: string, fieldKey?: string) => JsonObjectParseResult;
};

export function useLibraryAssetEditorActions(deps: UseLibraryAssetEditorActionsDeps) {
  function cancelAssetEdit() {
    deps.editingAssetId.value = "";
    deps.assetEditDisplayName.value = "";
    deps.assetEditFolderId.value = "";
    deps.assetEditOpenMode.value = "embed";
    deps.assetEditParserMode.value = "auto";
    deps.assetEditEmbedProfileId.value = "";
    deps.assetEditEmbedOptionsJson.value = "{}";
    deps.clearFieldErrors("editAssetFolderId", "editAssetEmbedProfile", "editAssetEmbedOptionsJson");
  }

  function startEditAsset(asset: LibraryAsset) {
    deps.setActivePanelTab("asset");
    deps.ensurePanelSectionOpen("asset:edit");
    deps.editingAssetId.value = asset.id;
    deps.assetEditDisplayName.value = asset.displayName || "";
    deps.assetEditFolderId.value = asset.folderId || deps.selectedFolderId.value;
    deps.assetEditOpenMode.value = asset.openMode;
    if (asset.embedProfileId) {
      deps.assetEditParserMode.value = "profile";
      deps.assetEditEmbedProfileId.value = asset.embedProfileId;
      deps.assetEditEmbedOptionsJson.value = JSON.stringify(asset.embedOptions || {}, null, 2);
    } else {
      deps.assetEditParserMode.value = "auto";
      deps.assetEditEmbedProfileId.value = "";
      deps.assetEditEmbedOptionsJson.value = "{}";
    }
  }

  async function saveAssetEdit() {
    deps.clearFieldErrors("editAssetFolderId", "editAssetEmbedProfile", "editAssetEmbedOptionsJson");
    if (!deps.editingAssetId.value) return;
    if (!deps.assetEditFolderId.value) {
      deps.setFieldError("editAssetFolderId", "请选择资源所属文件夹。");
      deps.setFeedback("请选择资源所属文件夹。", true);
      return;
    }
    if (deps.assetEditParserMode.value === "profile" && !deps.assetEditEmbedProfileId.value) {
      deps.setFieldError("editAssetEmbedProfile", "请选择 Embed 平台。");
      deps.setFeedback("请选择 Embed 平台。", true);
      return;
    }
    const parsed = deps.parseJsonObjectInput(
      deps.assetEditParserMode.value === "profile" ? deps.assetEditEmbedOptionsJson.value : "{}",
      "Embed 参数 JSON",
      "editAssetEmbedOptionsJson",
    );
    if (!parsed.ok) return;

    deps.savingAsset.value = true;
    deps.setFeedback("");
    try {
      await updateLibraryAsset(deps.editingAssetId.value, {
        displayName: deps.assetEditDisplayName.value.trim(),
        folderId: deps.assetEditFolderId.value,
        openMode: deps.assetEditOpenMode.value,
        embedProfileId: deps.assetEditParserMode.value === "profile" ? deps.assetEditEmbedProfileId.value : "",
        embedOptions: deps.assetEditParserMode.value === "profile" ? parsed.value : {},
      });
      const previousFolderId = deps.selectedFolderId.value;
      await deps.reloadFolders();
      if (previousFolderId) deps.selectedFolderId.value = previousFolderId;
      await deps.reloadFolderAssets();
      deps.setActivePanelTab("asset");
      deps.setFeedback("资源已更新。");
      cancelAssetEdit();
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.status === 401) {
        deps.setFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "embed_profile_not_found") {
        deps.setFeedback("所选 Embed 平台不存在或已禁用。", true);
        return;
      }
      if (e?.data?.error === "embed_profile_extension_mismatch") {
        deps.setFeedback("资源扩展名不在目标 Embed 平台支持范围内。", true);
        return;
      }
      if (e?.data?.error === "unsupported_asset_type") {
        deps.setFeedback("当前资源无法切换到自动适配，请保持 Embed 平台模式。", true);
        return;
      }
      deps.setFeedback("更新资源失败。", true);
    } finally {
      deps.savingAsset.value = false;
    }
  }

  async function renameAssetDisplayName(asset: LibraryAsset) {
    const current = asset.displayName || asset.fileName || "";
    const next = window.prompt("请输入新的显示名称（留空则恢复文件名显示）", current);
    if (next === null) return;
    deps.savingAsset.value = true;
    deps.setFeedback("");
    try {
      await updateLibraryAsset(asset.id, { displayName: next.trim() });
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      deps.setFeedback("显示名称已更新。");
    } catch (err) {
      const e = err as { status?: number };
      deps.setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "更新显示名称失败。", true);
    } finally {
      deps.savingAsset.value = false;
    }
  }

  return {
    cancelAssetEdit,
    startEditAsset,
    saveAssetEdit,
    renameAssetDisplayName,
  };
}
