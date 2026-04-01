import type { Ref } from "vue";
import {
  deleteLibraryAssetPermanently,
  restoreLibraryAsset,
  updateLibraryAsset,
  uploadLibraryAsset,
} from "./libraryApi";
import type { JsonObjectParseResult, LibraryPanelTab } from "./libraryAdminModels";
import type { LibraryAsset, LibraryOpenMode } from "./types";

type UseLibraryAssetCrudActionsDeps = {
  savingAsset: Ref<boolean>;
  selectedFolderId: Ref<string>;
  assetFile: Ref<File | null>;
  assetDisplayName: Ref<string>;
  openMode: Ref<LibraryOpenMode>;
  assetParserMode: Ref<"auto" | "profile">;
  assetEmbedProfileId: Ref<string>;
  assetEmbedOptionsJson: Ref<string>;
  reloadFolders: () => Promise<void>;
  reloadFolderAssets: () => Promise<void>;
  setActivePanelTab: (tab: LibraryPanelTab) => void;
  setFeedback: (message: string, isError?: boolean) => void;
  setFieldError: (key: string, message: string) => void;
  clearFieldErrors: (...keys: string[]) => void;
  parseJsonObjectInput: (raw: string, fieldLabel: string, fieldKey?: string) => JsonObjectParseResult;
};

export function useLibraryAssetCrudActions(deps: UseLibraryAssetCrudActionsDeps) {
  function onAssetFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    deps.assetFile.value = target.files?.[0] || null;
    deps.clearFieldErrors("uploadAssetFile");
  }

  async function uploadAssetEntry() {
    deps.clearFieldErrors("uploadAssetFile", "uploadAssetEmbedProfile", "uploadAssetEmbedOptionsJson");
    if (!deps.selectedFolderId.value) {
      deps.setFeedback("请先选择文件夹。", true);
      return;
    }
    if (!deps.assetFile.value) {
      deps.setFieldError("uploadAssetFile", "请选择要上传的资源文件。");
      deps.setFeedback("请选择要上传的资源文件。", true);
      return;
    }
    if (deps.assetParserMode.value === "profile" && !deps.assetEmbedProfileId.value) {
      deps.setFieldError("uploadAssetEmbedProfile", "请选择用于解析的 Embed 平台。");
      deps.setFeedback("请选择用于解析的 Embed 平台。", true);
      return;
    }

    let embedOptionsJson = "";
    if (deps.assetParserMode.value === "profile" && deps.assetEmbedOptionsJson.value.trim()) {
      const parsed = deps.parseJsonObjectInput(
        deps.assetEmbedOptionsJson.value,
        "Embed 参数 JSON",
        "uploadAssetEmbedOptionsJson",
      );
      if (!parsed.ok) return;
      embedOptionsJson = JSON.stringify(parsed.value);
    }

    deps.savingAsset.value = true;
    deps.setFeedback("");
    try {
      await uploadLibraryAsset({
        folderId: deps.selectedFolderId.value,
        file: deps.assetFile.value,
        openMode: deps.openMode.value,
        displayName: deps.assetDisplayName.value.trim(),
        embedProfileId: deps.assetParserMode.value === "profile" ? deps.assetEmbedProfileId.value : "",
        embedOptionsJson: deps.assetParserMode.value === "profile" ? embedOptionsJson : "",
      });
      deps.assetFile.value = null;
      deps.assetDisplayName.value = "";
      deps.openMode.value = "embed";
      deps.assetEmbedOptionsJson.value = "";
      deps.assetParserMode.value = "auto";
      deps.clearFieldErrors("uploadAssetFile", "uploadAssetEmbedProfile", "uploadAssetEmbedOptionsJson");
      const input = document.querySelector<HTMLInputElement>("#library-asset-file");
      if (input) input.value = "";
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      deps.setActivePanelTab("asset");
      deps.setFeedback("资源上传成功。");
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.status === 401) {
        deps.setFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "unsupported_asset_type") {
        deps.setFeedback("当前仅支持 .ggb/PhET HTML 自动识别，或选择 Embed 平台进行解析。", true);
        return;
      }
      if (e?.data?.error === "embed_profile_not_found") {
        deps.setFeedback("所选 Embed 平台不存在或已禁用。", true);
        return;
      }
      if (e?.data?.error === "invalid_embed_options_json") {
        deps.setFeedback("Embed 参数 JSON 无效。", true);
        return;
      }
      if (e?.data?.error === "embed_profile_extension_mismatch") {
        deps.setFeedback("该文件扩展名不在 Embed 平台允许列表中。", true);
        return;
      }
      deps.setFeedback("资源上传失败。", true);
    } finally {
      deps.savingAsset.value = false;
    }
  }

  async function switchAssetOpenMode(asset: LibraryAsset, mode: LibraryOpenMode) {
    if (asset.openMode === mode) return;
    deps.savingAsset.value = true;
    deps.setFeedback("");
    try {
      await updateLibraryAsset(asset.id, { openMode: mode });
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      deps.setFeedback(mode === "embed" ? "已切换为演示模式。" : "已切换为仅下载模式。");
    } catch (err) {
      const e = err as { status?: number };
      deps.setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "切换打开方式失败。", true);
    } finally {
      deps.savingAsset.value = false;
    }
  }

  async function restoreDeletedAsset(assetId: string) {
    deps.savingAsset.value = true;
    deps.setFeedback("");
    try {
      await restoreLibraryAsset(assetId);
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      deps.setFeedback("资源已恢复。");
    } catch (err) {
      const e = err as { status?: number };
      deps.setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "恢复资源失败。", true);
    } finally {
      deps.savingAsset.value = false;
    }
  }

  async function removeDeletedAssetPermanently(asset: LibraryAsset) {
    const label = asset.displayName || asset.fileName || asset.id;
    if (!window.confirm(`确定永久删除“${label}”吗？该操作不可恢复。`)) return;
    deps.savingAsset.value = true;
    deps.setFeedback("");
    try {
      await deleteLibraryAssetPermanently(asset.id);
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      deps.setFeedback("资源已永久删除，不可恢复。");
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.status === 401) {
        deps.setFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "asset_not_deleted") {
        deps.setFeedback("请先将资源移入回收站，再执行永久删除。", true);
        return;
      }
      deps.setFeedback("永久删除失败。", true);
    } finally {
      deps.savingAsset.value = false;
    }
  }

  return {
    onAssetFileChange,
    uploadAssetEntry,
    switchAssetOpenMode,
    restoreDeletedAsset,
    removeDeletedAssetPermanently,
  };
}
