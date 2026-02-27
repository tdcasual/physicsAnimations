<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { listTaxonomy } from "../../features/admin/adminApi";
import {
  createLibraryEmbedProfile,
  createLibraryFolder,
  deleteLibraryAsset,
  deleteLibraryAssetPermanently,
  deleteLibraryEmbedProfile,
  deleteLibraryFolder,
  getLibraryFolder,
  listLibraryDeletedAssets,
  listLibraryEmbedProfiles,
  listLibraryFolderAssets,
  listLibraryFolders,
  restoreLibraryAsset,
  syncLibraryEmbedProfile,
  updateLibraryAsset,
  updateLibraryEmbedProfile,
  updateLibraryFolder,
  uploadLibraryAsset,
  uploadLibraryFolderCover,
} from "../../features/library/libraryApi";
import type { LibraryAsset, LibraryEmbedProfile, LibraryFolder, LibraryOpenMode } from "../../features/library/types";

interface CategoryRow {
  id: string;
  groupId: string;
  title: string;
}

interface GroupRow {
  id: string;
  title: string;
}

type LibraryPanelTab = "folder" | "asset" | "embed";
type AssetSortMode = "updated_desc" | "updated_asc" | "name_asc" | "name_desc";

interface AssetBatchResult {
  actionLabel: string;
  successIds: string[];
  failed: Array<{ id: string; reason: string }>;
}

interface OperationLogEntry {
  id: string;
  message: string;
  level: "success" | "error" | "info";
  at: string;
}

const loading = ref(false);
const savingFolder = ref(false);
const savingAsset = ref(false);
const savingEmbed = ref(false);
const saving = computed(() => savingFolder.value || savingAsset.value || savingEmbed.value);
const feedback = ref("");
const feedbackError = ref(false);
const fieldErrors = ref<Record<string, string>>({});

const folders = ref<LibraryFolder[]>([]);
const selectedFolderId = ref("");
const folderAssets = ref<LibraryAsset[]>([]);
const deletedAssets = ref<LibraryAsset[]>([]);
const embedProfiles = ref<LibraryEmbedProfile[]>([]);
const categories = ref<CategoryRow[]>([]);
const groups = ref<GroupRow[]>([]);

const folderName = ref("");
const folderCategoryId = ref("other");
const createCoverFile = ref<File | null>(null);
const folderEditName = ref("");
const folderEditCategoryId = ref("other");

const coverFile = ref<File | null>(null);
const assetFile = ref<File | null>(null);
const assetDisplayName = ref("");
const openMode = ref<LibraryOpenMode>("embed");
const assetParserMode = ref<"auto" | "profile">("auto");
const assetEmbedProfileId = ref("");
const assetEmbedOptionsJson = ref("");
const editingAssetId = ref("");
const assetEditDisplayName = ref("");
const assetEditFolderId = ref("");
const assetEditOpenMode = ref<LibraryOpenMode>("embed");
const assetEditParserMode = ref<"auto" | "profile">("auto");
const assetEditEmbedProfileId = ref("");
const assetEditEmbedOptionsJson = ref("{}");

const embedProfileName = ref("");
const embedScriptUrl = ref("");
const embedFallbackScriptUrl = ref("");
const embedViewerPath = ref("");
const embedConstructorName = ref("ElectricFieldApp");
const embedAssetUrlOptionKey = ref("sceneUrl");
const embedExtensionsText = ref("");
const embedDefaultOptionsJson = ref("{}");
const embedEnabled = ref(true);
const editingEmbedProfileId = ref("");
const embedEditName = ref("");
const embedEditScriptUrl = ref("");
const embedEditFallbackScriptUrl = ref("");
const embedEditViewerPath = ref("");
const embedEditConstructorName = ref("ElectricFieldApp");
const embedEditAssetUrlOptionKey = ref("sceneUrl");
const embedEditExtensionsText = ref("");
const embedEditDefaultOptionsJson = ref("{}");
const embedEditEnabled = ref(true);
const activePanelTab = ref<LibraryPanelTab>("folder");
const folderSearchQuery = ref("");
const assetSearchQuery = ref("");
const profileSearchQuery = ref("");
const assetModeFilter = ref<"all" | LibraryOpenMode>("all");
const assetEmbedProfileFilter = ref("all");
const assetSortMode = ref<AssetSortMode>("updated_desc");
const assetBatchMoveFolderId = ref("");
const selectedAssetIds = ref<string[]>([]);
const assetBatchResult = ref<AssetBatchResult | null>(null);
const undoAssetIds = ref<string[]>([]);
const operationLogs = ref<OperationLogEntry[]>([]);
const operationLogFilter = ref<"all" | "success" | "error" | "info">("all");
const folderAssetsLoadSeq = ref(0);
const panelSections = ref<Record<string, boolean>>({
  "folder:meta": true,
  "folder:cover": true,
  "asset:upload": true,
  "asset:edit": true,
  "embed:create": true,
  "embed:list": true,
  "embed:edit": true,
  "recent:log": true,
});

const selectedFolder = computed(() => folders.value.find((folder) => folder.id === selectedFolderId.value) || null);
const groupedCategoryOptions = computed(() => {
  const groupsMap = new Map(groups.value.map((group) => [group.id, group.title]));
  const options = categories.value.map((category) => ({
    value: category.id,
    label: `${groupsMap.get(category.groupId) || category.groupId} / ${category.title}`,
  }));
  if (options.length === 0) {
    options.push({
      value: "other",
      label: "物理 / 其他",
    });
  }
  return options;
});
const selectableEmbedProfiles = computed(() => embedProfiles.value.filter((profile) => profile.enabled !== false));
const editingAsset = computed(() => folderAssets.value.find((asset) => asset.id === editingAssetId.value) || null);
const selectedFolderAssetCount = computed(() => {
  if (!selectedFolder.value) return 0;
  return Number(selectedFolder.value.assetCount || folderAssets.value.length || 0);
});
const filteredFolders = computed(() => {
  const query = folderSearchQuery.value.trim().toLowerCase();
  if (!query) return folders.value;
  return folders.value.filter((folder) => {
    const hay = `${folder.name || ""}\n${folder.categoryId || ""}\n${folder.id || ""}`.toLowerCase();
    return hay.includes(query);
  });
});
const filteredFolderAssets = computed(() => {
  const query = assetSearchQuery.value.trim().toLowerCase();
  return folderAssets.value.filter((asset) => {
    if (assetModeFilter.value !== "all" && asset.openMode !== assetModeFilter.value) return false;
    if (assetEmbedProfileFilter.value === "none" && asset.embedProfileId) return false;
    if (
      assetEmbedProfileFilter.value !== "all" &&
      assetEmbedProfileFilter.value !== "none" &&
      asset.embedProfileId !== assetEmbedProfileFilter.value
    ) {
      return false;
    }
    if (!query) return true;
    const hay = `${asset.displayName || ""}\n${asset.fileName || ""}\n${asset.id || ""}\n${asset.embedProfileId || ""}`.toLowerCase();
    return hay.includes(query);
  });
});
const sortedFilteredFolderAssets = computed(() => {
  const list = filteredFolderAssets.value.slice();
  const safeText = (value: unknown) => String(value || "").toLowerCase();
  const toTime = (value: unknown) => {
    const n = new Date(String(value || "")).getTime();
    return Number.isFinite(n) ? n : 0;
  };

  list.sort((a, b) => {
    if (assetSortMode.value === "name_asc") {
      return safeText(a.displayName || a.fileName).localeCompare(safeText(b.displayName || b.fileName));
    }
    if (assetSortMode.value === "name_desc") {
      return safeText(b.displayName || b.fileName).localeCompare(safeText(a.displayName || a.fileName));
    }
    if (assetSortMode.value === "updated_asc") {
      return toTime(a.updatedAt || a.createdAt) - toTime(b.updatedAt || b.createdAt);
    }
    return toTime(b.updatedAt || b.createdAt) - toTime(a.updatedAt || a.createdAt);
  });

  return list;
});
const filteredEmbedProfiles = computed(() => {
  const query = profileSearchQuery.value.trim().toLowerCase();
  if (!query) return embedProfiles.value;
  return embedProfiles.value.filter((profile) => {
    const hay = `${profile.name || ""}\n${profile.id || ""}\n${profile.remoteScriptUrl || profile.scriptUrl || ""}`.toLowerCase();
    return hay.includes(query);
  });
});
const selectedAssetCount = computed(() => selectedAssetIds.value.length);
const hasSelectedAssets = computed(() => selectedAssetIds.value.length > 0);
const hasUndoAssets = computed(() => undoAssetIds.value.length > 0);
const filteredOperationLogs = computed(() => {
  if (operationLogFilter.value === "all") return operationLogs.value;
  return operationLogs.value.filter((item) => item.level === operationLogFilter.value);
});
const allFilteredAssetsSelected = computed(() => {
  if (filteredFolderAssets.value.length === 0) return false;
  const selected = new Set(selectedAssetIds.value);
  return filteredFolderAssets.value.every((asset) => selected.has(asset.id));
});

function parseJsonObjectInput(
  raw: string,
  fieldLabel: string,
  fieldKey = "",
): { ok: true; value: Record<string, unknown> } | { ok: false } {
  const text = String(raw || "").trim();
  if (!text) return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      if (fieldKey) setFieldError(fieldKey, `${fieldLabel} 需要是对象。`);
      setFeedback(`${fieldLabel} 需要是对象。`, true);
      return { ok: false };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    if (fieldKey) setFieldError(fieldKey, `${fieldLabel} 格式错误。`);
    setFeedback(`${fieldLabel} 格式错误。`, true);
    return { ok: false };
  }
}

function syncFolderEditDraft() {
  const folder = selectedFolder.value;
  if (!folder) {
    folderEditName.value = "";
    folderEditCategoryId.value = groupedCategoryOptions.value[0]?.value || "other";
    return;
  }
  folderEditName.value = folder.name || "";
  folderEditCategoryId.value = folder.categoryId || groupedCategoryOptions.value[0]?.value || "other";
}

function cancelAssetEdit() {
  editingAssetId.value = "";
  assetEditDisplayName.value = "";
  assetEditFolderId.value = "";
  assetEditOpenMode.value = "embed";
  assetEditParserMode.value = "auto";
  assetEditEmbedProfileId.value = "";
  assetEditEmbedOptionsJson.value = "{}";
  clearFieldErrors("editAssetFolderId", "editAssetEmbedProfile", "editAssetEmbedOptionsJson");
}

function clearSelectedAssets() {
  selectedAssetIds.value = [];
  assetBatchMoveFolderId.value = "";
}

function isAssetSelected(assetId: string) {
  return selectedAssetIds.value.includes(assetId);
}

function toggleAssetSelection(assetId: string, checked: boolean) {
  const current = new Set(selectedAssetIds.value);
  if (checked) current.add(assetId);
  else current.delete(assetId);
  selectedAssetIds.value = Array.from(current);
}

function onAssetSelectChange(assetId: string, event: Event) {
  const target = event.target as HTMLInputElement | null;
  toggleAssetSelection(assetId, !!target?.checked);
}

function onSelectAllFilteredAssetsChange(event: Event) {
  const target = event.target as HTMLInputElement | null;
  const checked = !!target?.checked;
  if (!checked) {
    clearSelectedAssets();
    return;
  }
  selectedAssetIds.value = sortedFilteredFolderAssets.value.map((asset) => asset.id);
}

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

function setFeedback(text: string, isError = false) {
  feedback.value = text;
  feedbackError.value = isError;
  const clean = String(text || "").trim();
  if (clean) {
    pushOperationLog(clean, isError ? "error" : "success");
  }
}

function setFieldError(fieldKey: string, text: string) {
  const key = String(fieldKey || "").trim();
  if (!key) return;
  fieldErrors.value = {
    ...fieldErrors.value,
    [key]: String(text || "").trim(),
  };
}

function clearFieldErrors(...fieldKeys: string[]) {
  if (fieldKeys.length === 0) {
    fieldErrors.value = {};
    return;
  }
  const next = { ...fieldErrors.value };
  for (const key of fieldKeys) delete next[key];
  fieldErrors.value = next;
}

function getFieldError(fieldKey: string) {
  return String(fieldErrors.value[String(fieldKey || "").trim()] || "");
}

function setActivePanelTab(tab: LibraryPanelTab) {
  activePanelTab.value = tab;
  if (tab === "folder") ensurePanelSectionOpen("folder:meta");
  if (tab === "asset") ensurePanelSectionOpen("asset:upload");
  if (tab === "embed") ensurePanelSectionOpen("embed:create");
}

function isPanelSectionOpen(key: string) {
  return panelSections.value[key] !== false;
}

function togglePanelSection(key: string) {
  panelSections.value[key] = !isPanelSectionOpen(key);
}

function ensurePanelSectionOpen(key: string) {
  panelSections.value[key] = true;
}

function formatOperationTime(value: string) {
  const date = new Date(String(value || ""));
  const time = date.getTime();
  if (!Number.isFinite(time)) return String(value || "");
  return date.toLocaleString("zh-CN", { hour12: false });
}

function pushOperationLog(message: string, level: "success" | "error" | "info" = "info") {
  const entry: OperationLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message: String(message || "").trim(),
    level,
    at: new Date().toISOString(),
  };
  if (!entry.message) return;
  operationLogs.value = [entry, ...operationLogs.value].slice(0, 18);
}

function clearOperationLogs() {
  operationLogs.value = [];
}

function getApiErrorCode(err: unknown): string {
  const e = err as { data?: any; message?: string };
  if (typeof e?.data?.error === "string" && e.data.error) return e.data.error;
  if (typeof e?.message === "string" && e.message) return e.message;
  return "unknown_error";
}

function setAssetBatchResult(actionLabel: string, successIds: string[], failed: Array<{ id: string; reason: string }>) {
  assetBatchResult.value = {
    actionLabel,
    successIds,
    failed,
  };
}

function onCreateCoverFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  createCoverFile.value = target.files?.[0] || null;
}

function onCoverFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  coverFile.value = target.files?.[0] || null;
}

function onAssetFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  assetFile.value = target.files?.[0] || null;
  clearFieldErrors("uploadAssetFile");
}

async function reloadFolders() {
  const list = await listLibraryFolders();
  folders.value = list;
  if (!selectedFolderId.value && list.length > 0) {
    selectedFolderId.value = list[0].id;
  } else if (selectedFolderId.value && !list.some((folder) => folder.id === selectedFolderId.value)) {
    selectedFolderId.value = list[0]?.id || "";
  }
  syncFolderEditDraft();
}

function syncCategorySelection() {
  if (groupedCategoryOptions.value.some((item) => item.value === folderCategoryId.value)) return;
  folderCategoryId.value = groupedCategoryOptions.value[0]?.value || "other";
}

function syncFolderEditCategorySelection() {
  if (groupedCategoryOptions.value.some((item) => item.value === folderEditCategoryId.value)) return;
  folderEditCategoryId.value = groupedCategoryOptions.value[0]?.value || "other";
}

async function reloadTaxonomy() {
  const data = await listTaxonomy();
  groups.value = Array.isArray(data?.groups) ? data.groups : [];
  categories.value = Array.isArray(data?.categories) ? data.categories : [];
  syncCategorySelection();
  syncFolderEditCategorySelection();
}

async function reloadFolderAssets() {
  const folderId = selectedFolderId.value;
  const requestId = folderAssetsLoadSeq.value + 1;
  folderAssetsLoadSeq.value = requestId;
  if (!folderId) {
    folderAssets.value = [];
    deletedAssets.value = [];
    cancelAssetEdit();
    clearSelectedAssets();
    return;
  }
  try {
    const [folder, assets, deleted] = await Promise.all([
      getLibraryFolder(folderId),
      listLibraryFolderAssets(folderId),
      listLibraryDeletedAssets(folderId),
    ]);
    if (requestId !== folderAssetsLoadSeq.value || selectedFolderId.value !== folderId) return;
    const idx = folders.value.findIndex((value) => value.id === folder.id);
    if (idx >= 0) {
      const nextCount = Number(folder.assetCount ?? assets.assets.length);
      folders.value[idx] = {
        ...folders.value[idx],
        ...folder,
        assetCount: Number.isFinite(nextCount) ? nextCount : assets.assets.length,
      };
    }
    folderAssets.value = assets.assets;
    deletedAssets.value = deleted.assets;
    const idSet = new Set(assets.assets.map((asset) => asset.id));
    selectedAssetIds.value = selectedAssetIds.value.filter((id) => idSet.has(id));
    undoAssetIds.value = undoAssetIds.value.filter((id) => deleted.assets.some((asset) => asset.id === id));
    if (editingAssetId.value && !assets.assets.some((asset) => asset.id === editingAssetId.value)) {
      cancelAssetEdit();
    }
    syncFolderEditDraft();
  } catch (err) {
    if (requestId !== folderAssetsLoadSeq.value || selectedFolderId.value !== folderId) return;
    folderAssets.value = [];
    deletedAssets.value = [];
    clearSelectedAssets();
    cancelAssetEdit();
    syncFolderEditDraft();
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "加载文件夹资源失败。", true);
  }
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

async function createFolderEntry() {
  clearFieldErrors("createFolderName");
  const name = folderName.value.trim();
  if (!name) {
    setFieldError("createFolderName", "请填写文件夹名称。");
    setFeedback("请填写文件夹名称。", true);
    return;
  }
  savingFolder.value = true;
  setFeedback("");
  try {
    const created = await createLibraryFolder({
      name,
      categoryId: folderCategoryId.value.trim() || "other",
      coverType: "blank",
    });
    const createdFolderId = String(created?.folder?.id || "");
    if (createCoverFile.value && createdFolderId) {
      await uploadLibraryFolderCover({
        folderId: createdFolderId,
        file: createCoverFile.value,
      });
    }
    folderName.value = "";
    createCoverFile.value = null;
    const createCoverInput = document.querySelector<HTMLInputElement>("#library-create-cover-file");
    if (createCoverInput) createCoverInput.value = "";
    await reloadFolders();
    await reloadFolderAssets();
    setActivePanelTab("folder");
    clearFieldErrors("createFolderName");
    setFeedback("文件夹已创建。");
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.data?.error === "cover_invalid_type") {
      setFeedback("封面仅支持图片类型。", true);
      return;
    }
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "创建文件夹失败。", true);
  } finally {
    savingFolder.value = false;
  }
}

async function saveFolderMeta() {
  clearFieldErrors("editFolderName");
  if (!selectedFolderId.value) {
    setFeedback("请先选择文件夹。", true);
    return;
  }
  const name = folderEditName.value.trim();
  if (!name) {
    setFieldError("editFolderName", "文件夹名称不能为空。");
    setFeedback("文件夹名称不能为空。", true);
    return;
  }
  savingFolder.value = true;
  setFeedback("");
  try {
    await updateLibraryFolder(selectedFolderId.value, {
      name,
      categoryId: folderEditCategoryId.value.trim() || "other",
    });
    await reloadFolders();
    await reloadFolderAssets();
    setActivePanelTab("folder");
    clearFieldErrors("editFolderName");
    setFeedback("文件夹信息已更新。");
  } catch (err) {
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "更新文件夹失败。", true);
  } finally {
    savingFolder.value = false;
  }
}

async function uploadCover() {
  if (!selectedFolderId.value) {
    setFeedback("请先选择文件夹。", true);
    return;
  }
  if (!coverFile.value) {
    setFeedback("请选择封面图片。", true);
    return;
  }
  savingFolder.value = true;
  setFeedback("");
  try {
    await uploadLibraryFolderCover({
      folderId: selectedFolderId.value,
      file: coverFile.value,
    });
    coverFile.value = null;
    const input = document.querySelector<HTMLInputElement>("#library-cover-file");
    if (input) input.value = "";
    await reloadFolders();
    await reloadFolderAssets();
    setActivePanelTab("folder");
    setFeedback("封面上传成功。");
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 401) {
      setFeedback("请先登录管理员账号。", true);
      return;
    }
    if (e?.data?.error === "cover_invalid_type") {
      setFeedback("封面仅支持图片类型。", true);
      return;
    }
    setFeedback("封面上传失败。", true);
  } finally {
    savingFolder.value = false;
  }
}

async function uploadAssetEntry() {
  clearFieldErrors("uploadAssetFile", "uploadAssetEmbedProfile", "uploadAssetEmbedOptionsJson");
  if (!selectedFolderId.value) {
    setFeedback("请先选择文件夹。", true);
    return;
  }
  if (!assetFile.value) {
    setFieldError("uploadAssetFile", "请选择要上传的资源文件。");
    setFeedback("请选择要上传的资源文件。", true);
    return;
  }
  if (assetParserMode.value === "profile" && !assetEmbedProfileId.value) {
    setFieldError("uploadAssetEmbedProfile", "请选择用于解析的 Embed 平台。");
    setFeedback("请选择用于解析的 Embed 平台。", true);
    return;
  }

  let embedOptionsJson = "";
  if (assetParserMode.value === "profile" && assetEmbedOptionsJson.value.trim()) {
    const parsed = parseJsonObjectInput(assetEmbedOptionsJson.value, "Embed 参数 JSON", "uploadAssetEmbedOptionsJson");
    if (!parsed.ok) return;
    embedOptionsJson = JSON.stringify(parsed.value);
  }

  savingAsset.value = true;
  setFeedback("");
  try {
    await uploadLibraryAsset({
      folderId: selectedFolderId.value,
      file: assetFile.value,
      openMode: openMode.value,
      displayName: assetDisplayName.value.trim(),
      embedProfileId: assetParserMode.value === "profile" ? assetEmbedProfileId.value : "",
      embedOptionsJson: assetParserMode.value === "profile" ? embedOptionsJson : "",
    });
    assetFile.value = null;
    assetDisplayName.value = "";
    openMode.value = "embed";
    assetEmbedOptionsJson.value = "";
    assetParserMode.value = "auto";
    clearFieldErrors("uploadAssetFile", "uploadAssetEmbedProfile", "uploadAssetEmbedOptionsJson");
    const input = document.querySelector<HTMLInputElement>("#library-asset-file");
    if (input) input.value = "";
    await reloadFolders();
    await reloadFolderAssets();
    setActivePanelTab("asset");
    setFeedback("资源上传成功。");
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 401) {
      setFeedback("请先登录管理员账号。", true);
      return;
    }
    if (e?.data?.error === "unsupported_asset_type") {
      setFeedback("当前仅支持 .ggb/PhET HTML 自动识别，或选择 Embed 平台进行解析。", true);
      return;
    }
    if (e?.data?.error === "embed_profile_not_found") {
      setFeedback("所选 Embed 平台不存在或已禁用。", true);
      return;
    }
    if (e?.data?.error === "invalid_embed_options_json") {
      setFeedback("Embed 参数 JSON 无效。", true);
      return;
    }
    if (e?.data?.error === "embed_profile_extension_mismatch") {
      setFeedback("该文件扩展名不在 Embed 平台允许列表中。", true);
      return;
    }
    setFeedback("资源上传失败。", true);
  } finally {
    savingAsset.value = false;
  }
}

async function switchAssetOpenMode(asset: LibraryAsset, mode: LibraryOpenMode) {
  if (asset.openMode === mode) return;
  savingAsset.value = true;
  setFeedback("");
  try {
    await updateLibraryAsset(asset.id, { openMode: mode });
    await reloadFolders();
    await reloadFolderAssets();
    setFeedback(mode === "embed" ? "已切换为演示模式。" : "已切换为仅下载模式。");
  } catch (err) {
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "切换打开方式失败。", true);
  } finally {
    savingAsset.value = false;
  }
}

async function runAssetBatchOpenMode(mode: LibraryOpenMode) {
  if (selectedAssetIds.value.length === 0) {
    setFeedback("请先选择要批量操作的资源。", true);
    return;
  }
  const targetIds = [...selectedAssetIds.value];
  savingAsset.value = true;
  setFeedback("");
  try {
    const successIds: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    for (const assetId of targetIds) {
      try {
        await updateLibraryAsset(assetId, { openMode: mode });
        successIds.push(assetId);
      } catch (err) {
        failed.push({
          id: assetId,
          reason: getApiErrorCode(err),
        });
      }
    }
    await reloadFolders();
    await reloadFolderAssets();
    clearSelectedAssets();
    setAssetBatchResult(mode === "embed" ? "批量设为演示" : "批量设为下载", successIds, failed);
    if (failed.length > 0) {
      setFeedback(`批量操作完成：成功 ${successIds.length}，失败 ${failed.length}。`, true);
      return;
    }
    setFeedback(mode === "embed" ? `已批量设为演示（${successIds.length}）。` : `已批量设为下载（${successIds.length}）。`);
  } catch (err) {
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "批量切换失败。", true);
  } finally {
    savingAsset.value = false;
  }
}

async function runAssetBatchMove() {
  if (selectedAssetIds.value.length === 0) {
    setFeedback("请先选择要批量移动的资源。", true);
    return;
  }
  if (!assetBatchMoveFolderId.value) {
    setFeedback("请选择目标文件夹。", true);
    return;
  }
  const targetIds = [...selectedAssetIds.value];
  savingAsset.value = true;
  setFeedback("");
  try {
    const successIds: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    for (const assetId of targetIds) {
      try {
        await updateLibraryAsset(assetId, { folderId: assetBatchMoveFolderId.value });
        successIds.push(assetId);
      } catch (err) {
        failed.push({
          id: assetId,
          reason: getApiErrorCode(err),
        });
      }
    }
    await reloadFolders();
    await reloadFolderAssets();
    clearSelectedAssets();
    setAssetBatchResult("批量移动", successIds, failed);
    if (failed.length > 0) {
      setFeedback(`批量移动完成：成功 ${successIds.length}，失败 ${failed.length}。`, true);
      return;
    }
    setFeedback(`资源已批量移动（${successIds.length}）。`);
  } catch (err) {
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "批量移动失败。", true);
  } finally {
    savingAsset.value = false;
  }
}

async function runAssetBatchDelete() {
  if (selectedAssetIds.value.length === 0) {
    setFeedback("请先选择要删除的资源。", true);
    return;
  }
  if (!window.confirm(`确定删除选中的 ${selectedAssetIds.value.length} 个资源吗？`)) return;
  const targetIds = [...selectedAssetIds.value];
  savingAsset.value = true;
  setFeedback("");
  try {
    const successIds: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    for (const assetId of targetIds) {
      try {
        await deleteLibraryAsset(assetId);
        successIds.push(assetId);
      } catch (err) {
        failed.push({
          id: assetId,
          reason: getApiErrorCode(err),
        });
      }
    }
    await reloadFolders();
    await reloadFolderAssets();
    clearSelectedAssets();
    undoAssetIds.value = successIds;
    setAssetBatchResult("批量删除", successIds, failed);
    if (failed.length > 0) {
      setFeedback(`批量删除完成：成功 ${successIds.length}，失败 ${failed.length}。`, true);
      return;
    }
    setFeedback(`批量删除完成：成功 ${successIds.length}。可点击“撤销最近删除”。`);
  } catch (err) {
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "批量删除失败。", true);
  } finally {
    savingAsset.value = false;
  }
}

async function runAssetBatchUndo() {
  if (undoAssetIds.value.length === 0) {
    setFeedback("当前没有可撤销的删除。", true);
    return;
  }
  const targetIds = [...undoAssetIds.value];
  savingAsset.value = true;
  setFeedback("");
  try {
    const successIds: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    for (const assetId of targetIds) {
      try {
        await restoreLibraryAsset(assetId);
        successIds.push(assetId);
      } catch (err) {
        failed.push({
          id: assetId,
          reason: getApiErrorCode(err),
        });
      }
    }
    await reloadFolders();
    await reloadFolderAssets();
    undoAssetIds.value = failed.map((item) => item.id);
    setAssetBatchResult("撤销删除", successIds, failed);
    if (failed.length > 0) {
      setFeedback(`撤销完成：恢复 ${successIds.length}，失败 ${failed.length}。`, true);
      return;
    }
    setFeedback(`撤销完成：已恢复 ${successIds.length} 个资源。`);
  } catch (err) {
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "撤销删除失败。", true);
  } finally {
    savingAsset.value = false;
  }
}

async function restoreDeletedAsset(assetId: string) {
  savingAsset.value = true;
  setFeedback("");
  try {
    await restoreLibraryAsset(assetId);
    await reloadFolders();
    await reloadFolderAssets();
    setFeedback("资源已恢复。");
  } catch (err) {
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "恢复资源失败。", true);
  } finally {
    savingAsset.value = false;
  }
}

async function removeDeletedAssetPermanently(asset: LibraryAsset) {
  const label = asset.displayName || asset.fileName || asset.id;
  if (!window.confirm(`确定永久删除“${label}”吗？该操作不可恢复。`)) return;
  savingAsset.value = true;
  setFeedback("");
  try {
    await deleteLibraryAssetPermanently(asset.id);
    await reloadFolders();
    await reloadFolderAssets();
    setFeedback("资源已永久删除，不可恢复。");
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 401) {
      setFeedback("请先登录管理员账号。", true);
      return;
    }
    if (e?.data?.error === "asset_not_deleted") {
      setFeedback("请先将资源移入回收站，再执行永久删除。", true);
      return;
    }
    setFeedback("永久删除失败。", true);
  } finally {
    savingAsset.value = false;
  }
}

function startEditAsset(asset: LibraryAsset) {
  setActivePanelTab("asset");
  ensurePanelSectionOpen("asset:edit");
  editingAssetId.value = asset.id;
  assetEditDisplayName.value = asset.displayName || "";
  assetEditFolderId.value = asset.folderId || selectedFolderId.value;
  assetEditOpenMode.value = asset.openMode;
  if (asset.embedProfileId) {
    assetEditParserMode.value = "profile";
    assetEditEmbedProfileId.value = asset.embedProfileId;
    assetEditEmbedOptionsJson.value = JSON.stringify(asset.embedOptions || {}, null, 2);
  } else {
    assetEditParserMode.value = "auto";
    assetEditEmbedProfileId.value = "";
    assetEditEmbedOptionsJson.value = "{}";
  }
}

async function saveAssetEdit() {
  clearFieldErrors("editAssetFolderId", "editAssetEmbedProfile", "editAssetEmbedOptionsJson");
  if (!editingAssetId.value) return;
  if (!assetEditFolderId.value) {
    setFieldError("editAssetFolderId", "请选择资源所属文件夹。");
    setFeedback("请选择资源所属文件夹。", true);
    return;
  }
  if (assetEditParserMode.value === "profile" && !assetEditEmbedProfileId.value) {
    setFieldError("editAssetEmbedProfile", "请选择 Embed 平台。");
    setFeedback("请选择 Embed 平台。", true);
    return;
  }
  const parsed = parseJsonObjectInput(
    assetEditParserMode.value === "profile" ? assetEditEmbedOptionsJson.value : "{}",
    "Embed 参数 JSON",
    "editAssetEmbedOptionsJson",
  );
  if (!parsed.ok) return;

  savingAsset.value = true;
  setFeedback("");
  try {
    await updateLibraryAsset(editingAssetId.value, {
      displayName: assetEditDisplayName.value.trim(),
      folderId: assetEditFolderId.value,
      openMode: assetEditOpenMode.value,
      embedProfileId: assetEditParserMode.value === "profile" ? assetEditEmbedProfileId.value : "",
      embedOptions: assetEditParserMode.value === "profile" ? parsed.value : {},
    });
    const previousFolderId = selectedFolderId.value;
    await reloadFolders();
    if (previousFolderId) selectedFolderId.value = previousFolderId;
    await reloadFolderAssets();
    setActivePanelTab("asset");
    setFeedback("资源已更新。");
    cancelAssetEdit();
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 401) {
      setFeedback("请先登录管理员账号。", true);
      return;
    }
    if (e?.data?.error === "embed_profile_not_found") {
      setFeedback("所选 Embed 平台不存在或已禁用。", true);
      return;
    }
    if (e?.data?.error === "embed_profile_extension_mismatch") {
      setFeedback("资源扩展名不在目标 Embed 平台支持范围内。", true);
      return;
    }
    if (e?.data?.error === "unsupported_asset_type") {
      setFeedback("当前资源无法切换到自动适配，请保持 Embed 平台模式。", true);
      return;
    }
    setFeedback("更新资源失败。", true);
  } finally {
    savingAsset.value = false;
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
  const defaultOptions = parsedDefaults.value;

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
      defaultOptions,
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
    const e = err as { status?: number; data?: any };
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
    const e = err as { status?: number; data?: any };
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
    const e = err as { status?: number; data?: any };
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
    const e = err as { status?: number; data?: any };
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

async function renameAssetDisplayName(asset: LibraryAsset) {
  const current = asset.displayName || asset.fileName || "";
  const next = window.prompt("请输入新的显示名称（留空则恢复文件名显示）", current);
  if (next === null) return;
  savingAsset.value = true;
  setFeedback("");
  try {
    await updateLibraryAsset(asset.id, { displayName: next.trim() });
    await reloadFolders();
    await reloadFolderAssets();
    setFeedback("显示名称已更新。");
  } catch (err) {
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "更新显示名称失败。", true);
  } finally {
    savingAsset.value = false;
  }
}

async function removeAsset(assetId: string) {
  if (!window.confirm("确定删除该资源吗？")) return;
  savingAsset.value = true;
  setFeedback("");
  try {
    await deleteLibraryAsset(assetId);
    await reloadFolders();
    await reloadFolderAssets();
    undoAssetIds.value = [assetId];
    setAssetBatchResult("删除资源", [assetId], []);
    setFeedback("资源已删除，可点击“撤销最近删除”。");
  } catch (err) {
    const e = err as { status?: number };
    setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "删除资源失败。", true);
  } finally {
    savingAsset.value = false;
  }
}

async function removeFolder(folderId: string) {
  if (!window.confirm("确定删除该文件夹吗？")) return;
  savingFolder.value = true;
  setFeedback("");
  try {
    await deleteLibraryFolder(folderId);
    if (selectedFolderId.value === folderId) selectedFolderId.value = "";
    await reloadFolders();
    await reloadFolderAssets();
    setFeedback("文件夹已删除。");
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 401) {
      setFeedback("请先登录管理员账号。", true);
      return;
    }
    if (e?.data?.error === "folder_not_empty") {
      setFeedback("文件夹非空，需先删除其中资源。", true);
      return;
    }
    setFeedback("删除文件夹失败。", true);
  } finally {
    savingFolder.value = false;
}
}

watch(selectedFolderId, () => {
  syncFolderEditDraft();
  assetBatchResult.value = null;
  undoAssetIds.value = [];
  void reloadFolderAssets().catch(() => {});
});

watch(filteredFolderAssets, (list) => {
  const visible = new Set(list.map((asset) => asset.id));
  selectedAssetIds.value = selectedAssetIds.value.filter((id) => visible.has(id));
});

watch(assetParserMode, (mode) => {
  if (mode !== "profile") {
    assetEmbedProfileId.value = "";
    assetEmbedOptionsJson.value = "";
    clearFieldErrors("uploadAssetEmbedProfile", "uploadAssetEmbedOptionsJson");
    return;
  }
  if (!assetEmbedProfileId.value) {
    assetEmbedProfileId.value = selectableEmbedProfiles.value[0]?.id || "";
  }
});

watch(assetEditParserMode, (mode) => {
  if (mode !== "profile") {
    assetEditEmbedProfileId.value = "";
    assetEditEmbedOptionsJson.value = "{}";
    clearFieldErrors("editAssetEmbedProfile", "editAssetEmbedOptionsJson");
    return;
  }
  if (!assetEditEmbedProfileId.value) {
    assetEditEmbedProfileId.value = selectableEmbedProfiles.value[0]?.id || "";
  }
});

onMounted(async () => {
  loading.value = true;
  setFeedback("");
  try {
    await reloadTaxonomy().catch(() => {});
    await reloadEmbedProfiles().catch(() => {});
    await reloadFolders();
    await reloadFolderAssets();
  } catch {
    setFeedback("加载资源库管理数据失败。", true);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="admin-library-view">
    <header class="library-header">
      <div>
        <h2>资源库管理</h2>
        <div class="library-subtitle">面向课堂演示的文件夹、资源与 Embed 平台统一管理</div>
      </div>
      <div class="library-stats">
        <div class="stat-chip">文件夹 {{ folders.length }}</div>
        <div class="stat-chip">资源 {{ selectedFolderAssetCount }}</div>
        <div class="stat-chip">平台 {{ embedProfiles.length }}</div>
      </div>
    </header>

    <div class="library-workbench library-grid">
      <aside class="admin-card library-column library-column-left">
        <div class="column-head">
          <h3>文件夹</h3>
          <div class="asset-meta">按分类与关键词定位课堂素材</div>
        </div>
        <label class="field">
          <span>文件夹搜索</span>
          <input v-model="folderSearchQuery" class="field-input folder-search-input" type="text" placeholder="名称 / 分类 / ID" />
        </label>
        <div class="folder-list">
          <article
            v-for="folder in filteredFolders"
            :key="folder.id"
            class="folder-item"
            :class="{ active: selectedFolderId === folder.id }"
          >
            <button type="button" class="folder-pick" @click="selectedFolderId = folder.id">
              <div class="folder-name">{{ folder.name || folder.id }}</div>
              <div class="folder-meta">{{ folder.categoryId }} · {{ folder.assetCount || 0 }} 个资源</div>
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              :disabled="savingFolder"
              @click="
                selectedFolderId = folder.id;
                setActivePanelTab('folder');
              "
            >
              编辑
            </button>
            <button type="button" class="btn btn-ghost" :disabled="savingFolder" @click="removeFolder(folder.id)">删除</button>
          </article>
          <div v-if="!loading && filteredFolders.length === 0" class="empty">暂无匹配文件夹。</div>
        </div>

        <div class="column-divider" />

        <h3>新建文件夹</h3>
        <label class="field" :class="{ 'has-error': getFieldError('createFolderName') }">
          <span>名称</span>
          <input v-model="folderName" class="field-input" type="text" />
          <div v-if="getFieldError('createFolderName')" class="field-error-text">{{ getFieldError("createFolderName") }}</div>
        </label>
        <label class="field">
          <span>分类</span>
          <select v-model="folderCategoryId" class="field-input">
            <option v-for="option in groupedCategoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>创建时封面（可选）</span>
          <input id="library-create-cover-file" class="field-input" type="file" accept="image/*" @change="onCreateCoverFileChange" />
        </label>
        <div class="admin-actions">
          <button type="button" class="btn btn-primary" :disabled="savingFolder" @click="createFolderEntry">创建文件夹</button>
        </div>
      </aside>

      <section class="admin-card library-column library-column-middle">
        <div class="column-head">
          <h3>资源列表</h3>
          <div class="selected-folder">{{ selectedFolder?.name || "未选择文件夹" }}</div>
        </div>
        <label class="field">
          <span>资源搜索</span>
          <input
            v-model="assetSearchQuery"
            class="field-input asset-search-input"
            type="text"
            :disabled="!selectedFolderId"
            placeholder="显示名 / 源文件名 / 平台"
          />
        </label>
        <div class="asset-filter-row">
          <label class="field">
            <span>打开方式筛选</span>
            <select v-model="assetModeFilter" class="field-input asset-mode-filter">
              <option value="all">全部</option>
              <option value="embed">演示</option>
              <option value="download">仅下载</option>
            </select>
          </label>
          <label class="field">
            <span>Embed 平台筛选</span>
            <select v-model="assetEmbedProfileFilter" class="field-input asset-profile-filter">
              <option value="all">全部</option>
              <option value="none">仅自动适配</option>
              <option v-for="profile in embedProfiles" :key="profile.id" :value="profile.id">
                {{ profile.name || profile.id }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>排序</span>
            <select v-model="assetSortMode" class="field-input asset-sort-select">
              <option value="updated_desc">更新时间（新到旧）</option>
              <option value="updated_asc">更新时间（旧到新）</option>
              <option value="name_asc">名称（A-Z）</option>
              <option value="name_desc">名称（Z-A）</option>
            </select>
          </label>
        </div>
        <div v-if="selectedFolderId" class="asset-batch-toolbar">
          <label class="batch-select-all">
            <input
              type="checkbox"
              :checked="allFilteredAssetsSelected"
              :disabled="sortedFilteredFolderAssets.length === 0 || saving"
              @change="onSelectAllFilteredAssetsChange"
            />
            全选当前筛选
          </label>
          <div class="asset-meta">已选 {{ selectedAssetCount }}</div>
          <select v-model="assetBatchMoveFolderId" class="field-input batch-move-folder" :disabled="savingAsset || !hasSelectedAssets">
            <option value="">移动到...</option>
            <option v-for="folder in folders" :key="folder.id" :value="folder.id">
              {{ folder.name || folder.id }}
            </option>
          </select>
          <button type="button" class="btn btn-ghost" :disabled="savingAsset || !hasSelectedAssets || !assetBatchMoveFolderId" @click="runAssetBatchMove">
            批量移动
          </button>
          <button type="button" class="btn btn-ghost" :disabled="savingAsset || !hasSelectedAssets" @click="runAssetBatchOpenMode('embed')">
            批量设为演示
          </button>
          <button
            type="button"
            class="btn btn-ghost"
            :disabled="savingAsset || !hasSelectedAssets"
            @click="runAssetBatchOpenMode('download')"
          >
            批量设为下载
          </button>
          <button type="button" class="btn btn-ghost" :disabled="savingAsset || !hasSelectedAssets" @click="runAssetBatchDelete">
            批量删除
          </button>
          <button type="button" class="btn btn-ghost" :disabled="savingAsset || !hasUndoAssets" @click="runAssetBatchUndo">
            撤销最近删除
          </button>
        </div>
        <div v-if="assetBatchResult" class="asset-batch-result">
          <div class="asset-meta">
            {{ assetBatchResult.actionLabel }}：成功 {{ assetBatchResult.successIds.length }}，失败 {{ assetBatchResult.failed.length }}
          </div>
          <div v-if="assetBatchResult.failed.length > 0" class="asset-meta">
            失败项：{{ assetBatchResult.failed.map((item) => `${item.id}(${item.reason})`).join("，") }}
          </div>
        </div>

        <div class="asset-list-head">
          <div>选择</div>
          <div>资源信息</div>
          <div>操作</div>
        </div>
        <div class="asset-list">
          <article
            v-for="asset in sortedFilteredFolderAssets"
            :key="asset.id"
            class="asset-item"
            :class="{ selected: isAssetSelected(asset.id) }"
          >
            <label class="asset-select-wrap">
              <input
                class="asset-select-checkbox"
                type="checkbox"
                :checked="isAssetSelected(asset.id)"
                :disabled="savingAsset"
                @change="onAssetSelectChange(asset.id, $event)"
              />
            </label>
            <div class="asset-main">
              <div class="asset-name">{{ asset.displayName || asset.fileName || asset.id }}</div>
              <div class="asset-meta">源文件：{{ asset.fileName || asset.id }}</div>
              <div class="asset-meta">{{ asset.openMode === "embed" ? "演示" : "仅下载" }}</div>
              <div v-if="asset.embedProfileId" class="asset-meta">Embed 平台：{{ asset.embedProfileId }}</div>
            </div>
            <div class="asset-actions-inline">
              <button type="button" class="btn btn-ghost" :disabled="savingAsset" @click="startEditAsset(asset)">编辑</button>
              <button
                type="button"
                class="btn btn-ghost"
                :disabled="savingAsset"
                @click="switchAssetOpenMode(asset, asset.openMode === 'embed' ? 'download' : 'embed')"
              >
                {{ asset.openMode === "embed" ? "设为仅下载" : "设为演示" }}
              </button>
              <button type="button" class="btn btn-ghost" :disabled="savingAsset" @click="renameAssetDisplayName(asset)">重命名显示名</button>
              <button type="button" class="btn btn-ghost" :disabled="savingAsset" @click="removeAsset(asset.id)">删除</button>
            </div>
          </article>
          <div v-if="selectedFolderId && sortedFilteredFolderAssets.length === 0" class="empty">该文件夹暂无匹配资源。</div>
          <div v-if="!selectedFolderId" class="empty">先在左侧选择一个文件夹。</div>
        </div>
        <div v-if="selectedFolderId" class="deleted-assets-list">
          <div class="asset-meta">已删除资源（可恢复）</div>
          <article v-for="asset in deletedAssets" :key="asset.id" class="asset-item">
            <div class="asset-main">
              <div class="asset-name">{{ asset.displayName || asset.fileName || asset.id }}</div>
              <div class="asset-meta">源文件：{{ asset.fileName || asset.id }}</div>
              <div class="asset-meta">{{ asset.deletedAt ? `删除时间：${asset.deletedAt}` : "已删除" }}</div>
            </div>
            <div class="asset-actions-inline">
              <button type="button" class="btn btn-ghost" :disabled="savingAsset" @click="restoreDeletedAsset(asset.id)">恢复</button>
              <button type="button" class="btn btn-danger" :disabled="savingAsset" @click="removeDeletedAssetPermanently(asset)">永久删除</button>
            </div>
          </article>
          <div v-if="deletedAssets.length === 0" class="empty">当前文件夹暂无已删除资源。</div>
        </div>
      </section>

      <aside class="admin-card library-column library-column-right">
        <div class="library-panel-tabs">
          <button type="button" class="panel-tab" :class="{ active: activePanelTab === 'folder' }" @click="setActivePanelTab('folder')">
            文件夹设置
          </button>
          <button type="button" class="panel-tab" :class="{ active: activePanelTab === 'asset' }" @click="setActivePanelTab('asset')">
            资源上传/编辑
          </button>
          <button type="button" class="panel-tab" :class="{ active: activePanelTab === 'embed' }" @click="setActivePanelTab('embed')">
            Embed 平台管理
          </button>
        </div>

        <div v-if="activePanelTab === 'folder'" class="panel-content">
          <h3>文件夹操作</h3>

          <div class="panel-section">
            <button type="button" class="panel-section-toggle" @click="togglePanelSection('folder:meta')">
              <span>文件夹信息</span>
              <span class="asset-meta">{{ isPanelSectionOpen("folder:meta") ? "收起" : "展开" }}</span>
            </button>
            <div v-if="isPanelSectionOpen('folder:meta')" class="panel-section-body">
              <div class="field">
                <span>当前文件夹</span>
                <div class="selected-folder">{{ selectedFolder?.name || "未选择" }}</div>
              </div>
              <label class="field" :class="{ 'has-error': getFieldError('editFolderName') }">
                <span>名称</span>
                <input v-model="folderEditName" class="field-input" type="text" :disabled="!selectedFolderId" />
                <div v-if="getFieldError('editFolderName')" class="field-error-text">{{ getFieldError("editFolderName") }}</div>
              </label>
              <label class="field">
                <span>分类</span>
                <select v-model="folderEditCategoryId" class="field-input" :disabled="!selectedFolderId">
                  <option v-for="option in groupedCategoryOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <div class="admin-actions">
                <button type="button" class="btn btn-ghost" :disabled="savingFolder || !selectedFolderId" @click="saveFolderMeta">
                  保存文件夹信息
                </button>
              </div>
            </div>
          </div>

          <div class="panel-section">
            <button type="button" class="panel-section-toggle" @click="togglePanelSection('folder:cover')">
              <span>封面设置</span>
              <span class="asset-meta">{{ isPanelSectionOpen("folder:cover") ? "收起" : "展开" }}</span>
            </button>
            <div v-if="isPanelSectionOpen('folder:cover')" class="panel-section-body">
              <label class="field">
                <span>更改封面</span>
                <input id="library-cover-file" class="field-input" type="file" accept="image/*" @change="onCoverFileChange" />
              </label>
              <div class="admin-actions">
                <button type="button" class="btn btn-ghost" :disabled="savingFolder || !selectedFolderId" @click="uploadCover">上传封面</button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activePanelTab === 'asset'" class="panel-content">
          <h3>资源上传与编辑</h3>

          <div class="panel-section">
            <button type="button" class="panel-section-toggle" @click="togglePanelSection('asset:upload')">
              <span>上传资源</span>
              <span class="asset-meta">{{ isPanelSectionOpen("asset:upload") ? "收起" : "展开" }}</span>
            </button>
            <div v-if="isPanelSectionOpen('asset:upload')" class="panel-section-body">
              <label class="field" :class="{ 'has-error': getFieldError('uploadAssetFile') }">
                <span>资源文件</span>
                <input
                  id="library-asset-file"
                  class="field-input"
                  type="file"
                  accept=".ggb,.html,.htm,.json,.zip,application/vnd.geogebra.file,text/html,application/json,application/zip"
                  @change="onAssetFileChange"
                />
                <div v-if="getFieldError('uploadAssetFile')" class="field-error-text">{{ getFieldError("uploadAssetFile") }}</div>
              </label>
              <label class="field">
                <span>资源显示名称（可选）</span>
                <input v-model="assetDisplayName" class="field-input" type="text" placeholder="例如：力学-抛体运动演示" />
              </label>
              <label class="field">
                <span>解析方式</span>
                <select v-model="assetParserMode" class="field-input">
                  <option value="auto">自动识别（.ggb / PhET HTML）</option>
                  <option value="profile">指定 Embed 平台</option>
                </select>
              </label>
              <label v-if="assetParserMode === 'profile'" class="field" :class="{ 'has-error': getFieldError('uploadAssetEmbedProfile') }">
                <span>Embed 平台</span>
                <select v-model="assetEmbedProfileId" class="field-input">
                  <option v-for="profile in selectableEmbedProfiles" :key="profile.id" :value="profile.id">
                    {{ profile.name }} ({{ profile.id }})
                  </option>
                </select>
                <div v-if="getFieldError('uploadAssetEmbedProfile')" class="field-error-text">
                  {{ getFieldError("uploadAssetEmbedProfile") }}
                </div>
              </label>
              <label v-if="assetParserMode === 'profile'" class="field" :class="{ 'has-error': getFieldError('uploadAssetEmbedOptionsJson') }">
                <span>Embed 参数 JSON（可选）</span>
                <textarea
                  v-model="assetEmbedOptionsJson"
                  class="field-input"
                  rows="4"
                  placeholder='例如：{"mode":"view","autoplay":true}'
                />
                <div v-if="getFieldError('uploadAssetEmbedOptionsJson')" class="field-error-text">
                  {{ getFieldError("uploadAssetEmbedOptionsJson") }}
                </div>
              </label>
              <label class="field">
                <span>打开方式</span>
                <select v-model="openMode" class="field-input">
                  <option value="embed">演示（默认）</option>
                  <option value="download">仅下载原文件</option>
                </select>
              </label>
              <div class="admin-actions">
                <button type="button" class="btn btn-primary" :disabled="savingAsset || !selectedFolderId" @click="uploadAssetEntry">
                  上传资源
                </button>
              </div>
            </div>
          </div>

          <div class="panel-section">
            <button type="button" class="panel-section-toggle" @click="togglePanelSection('asset:edit')">
              <span>编辑资源</span>
              <span class="asset-meta">{{ isPanelSectionOpen("asset:edit") ? "收起" : "展开" }}</span>
            </button>
            <div v-if="isPanelSectionOpen('asset:edit')" class="panel-section-body">
              <div v-if="editingAssetId" class="editor-panel">
                <div class="asset-meta" v-if="editingAsset">资源 ID：{{ editingAsset.id }}</div>
                <label class="field">
                  <span>显示名称</span>
                  <input v-model="assetEditDisplayName" class="field-input" type="text" placeholder="留空则显示源文件名" />
                </label>
                <label class="field" :class="{ 'has-error': getFieldError('editAssetFolderId') }">
                  <span>所属文件夹</span>
                  <select v-model="assetEditFolderId" class="field-input">
                    <option v-for="folder in folders" :key="folder.id" :value="folder.id">
                      {{ folder.name || folder.id }}
                    </option>
                  </select>
                  <div v-if="getFieldError('editAssetFolderId')" class="field-error-text">{{ getFieldError("editAssetFolderId") }}</div>
                </label>
                <label class="field">
                  <span>解析方式</span>
                  <select v-model="assetEditParserMode" class="field-input">
                    <option value="auto">自动识别</option>
                    <option value="profile">指定 Embed 平台</option>
                  </select>
                </label>
                <label v-if="assetEditParserMode === 'profile'" class="field" :class="{ 'has-error': getFieldError('editAssetEmbedProfile') }">
                  <span>Embed 平台</span>
                  <select v-model="assetEditEmbedProfileId" class="field-input">
                    <option v-for="profile in selectableEmbedProfiles" :key="profile.id" :value="profile.id">
                      {{ profile.name }} ({{ profile.id }})
                    </option>
                  </select>
                  <div v-if="getFieldError('editAssetEmbedProfile')" class="field-error-text">
                    {{ getFieldError("editAssetEmbedProfile") }}
                  </div>
                </label>
                <label v-if="assetEditParserMode === 'profile'" class="field" :class="{ 'has-error': getFieldError('editAssetEmbedOptionsJson') }">
                  <span>Embed 参数 JSON</span>
                  <textarea
                    v-model="assetEditEmbedOptionsJson"
                    class="field-input"
                    rows="4"
                    placeholder='例如：{"mode":"view","autoplay":true}'
                  />
                  <div v-if="getFieldError('editAssetEmbedOptionsJson')" class="field-error-text">
                    {{ getFieldError("editAssetEmbedOptionsJson") }}
                  </div>
                </label>
                <label class="field">
                  <span>打开方式</span>
                  <select v-model="assetEditOpenMode" class="field-input">
                    <option value="embed">演示</option>
                    <option value="download">仅下载</option>
                  </select>
                </label>
                <div class="asset-actions-inline">
                  <button type="button" class="btn btn-primary" :disabled="savingAsset" @click="saveAssetEdit">保存资源</button>
                  <button type="button" class="btn btn-ghost" :disabled="savingAsset" @click="cancelAssetEdit">取消</button>
                </div>
              </div>
              <div v-else class="empty">在中间资源列表点击“编辑”后，可在此修改资源参数。</div>
            </div>
          </div>
        </div>

        <div v-else class="panel-content">
          <h3>Embed 平台管理</h3>
          <div class="panel-section">
            <button type="button" class="panel-section-toggle" @click="togglePanelSection('embed:create')">
              <span>新增平台</span>
              <span class="asset-meta">{{ isPanelSectionOpen("embed:create") ? "收起" : "展开" }}</span>
            </button>
            <div v-if="isPanelSectionOpen('embed:create')" class="panel-section-body">
              <label class="field" :class="{ 'has-error': getFieldError('createEmbedProfileName') }">
                <span>平台名称</span>
                <input v-model="embedProfileName" class="field-input" type="text" placeholder="例如：电场仿真" />
                <div v-if="getFieldError('createEmbedProfileName')" class="field-error-text">{{ getFieldError("createEmbedProfileName") }}</div>
              </label>
              <label class="field" :class="{ 'has-error': getFieldError('createEmbedScriptUrl') }">
                <span>embed.js 地址</span>
                <input
                  v-model="embedScriptUrl"
                  class="field-input"
                  type="text"
                  placeholder="例如：https://field.infinitas.fun/embed/embed.js"
                />
                <div v-if="getFieldError('createEmbedScriptUrl')" class="field-error-text">{{ getFieldError("createEmbedScriptUrl") }}</div>
              </label>
              <label class="field">
                <span>备用脚本地址（可选）</span>
                <input v-model="embedFallbackScriptUrl" class="field-input" type="text" placeholder="可选备用脚本 URL" />
              </label>
              <label class="field">
                <span>viewerPath（可选）</span>
                <input v-model="embedViewerPath" class="field-input" type="text" placeholder="为空则自动推导 viewer.html" />
              </label>
              <label class="field">
                <span>构造器名称</span>
                <input v-model="embedConstructorName" class="field-input" type="text" placeholder="ElectricFieldApp" />
              </label>
              <label class="field">
                <span>资源 URL 参数键</span>
                <input v-model="embedAssetUrlOptionKey" class="field-input" type="text" placeholder="sceneUrl" />
              </label>
              <label class="field">
                <span>允许扩展名（逗号分隔，可空）</span>
                <input v-model="embedExtensionsText" class="field-input" type="text" placeholder="json,zip,efield" />
              </label>
              <label class="field" :class="{ 'has-error': getFieldError('createEmbedDefaultOptionsJson') }">
                <span>默认参数 JSON</span>
                <textarea v-model="embedDefaultOptionsJson" class="field-input" rows="4" placeholder='例如：{"mode":"view"}' />
                <div v-if="getFieldError('createEmbedDefaultOptionsJson')" class="field-error-text">
                  {{ getFieldError("createEmbedDefaultOptionsJson") }}
                </div>
              </label>
              <label class="field">
                <span>
                  <input v-model="embedEnabled" type="checkbox" />
                  启用该平台
                </span>
              </label>
              <div class="admin-actions">
                <button type="button" class="btn btn-primary" :disabled="savingEmbed" @click="createEmbedProfileEntry">新增 Embed 平台</button>
              </div>
            </div>
          </div>

          <div class="panel-section">
            <button type="button" class="panel-section-toggle" @click="togglePanelSection('embed:list')">
              <span>平台列表</span>
              <span class="asset-meta">{{ isPanelSectionOpen("embed:list") ? "收起" : "展开" }}</span>
            </button>
            <div v-if="isPanelSectionOpen('embed:list')" class="panel-section-body">
              <label class="field">
                <span>平台搜索</span>
                <input
                  v-model="profileSearchQuery"
                  class="field-input profile-search-input"
                  type="text"
                  placeholder="名称 / ID / 脚本地址"
                />
              </label>
              <div class="asset-list">
                <article v-for="profile in filteredEmbedProfiles" :key="profile.id" class="asset-item">
                  <div class="asset-main">
                    <div class="asset-name">{{ profile.name || profile.id }}</div>
                    <div class="asset-meta">{{ profile.id }}</div>
                    <div class="asset-meta">远端脚本：{{ profile.remoteScriptUrl || profile.scriptUrl }}</div>
                    <div class="asset-meta">当前脚本：{{ profile.scriptUrl }}</div>
                    <div class="asset-meta">同步状态：{{ profile.syncStatus }} {{ profile.syncMessage ? `(${profile.syncMessage})` : "" }}</div>
                    <div class="asset-meta">{{ profile.lastSyncAt ? `上次同步：${profile.lastSyncAt}` : "尚未同步" }}</div>
                    <div class="asset-meta">{{ profile.enabled === false ? "禁用" : "启用" }}</div>
                  </div>
                  <div class="asset-actions-inline">
                    <button type="button" class="btn btn-ghost" :disabled="savingEmbed" @click="startEditEmbedProfile(profile)">编辑</button>
                    <button type="button" class="btn btn-ghost" :disabled="savingEmbed" @click="syncEmbedProfileEntry(profile.id)">手动更新</button>
                    <button type="button" class="btn btn-ghost" :disabled="savingEmbed" @click="removeEmbedProfile(profile.id)">删除</button>
                  </div>
                </article>
                <div v-if="!loading && filteredEmbedProfiles.length === 0" class="empty">暂无匹配 Embed 平台。</div>
              </div>
            </div>
          </div>

          <div class="panel-section">
            <button type="button" class="panel-section-toggle" @click="togglePanelSection('embed:edit')">
              <span>编辑平台</span>
              <span class="asset-meta">{{ isPanelSectionOpen("embed:edit") ? "收起" : "展开" }}</span>
            </button>
            <div v-if="isPanelSectionOpen('embed:edit')" class="panel-section-body">
              <div v-if="editingEmbedProfileId" class="editor-panel">
                <div class="asset-meta">平台 ID：{{ editingEmbedProfileId }}</div>
                <label class="field" :class="{ 'has-error': getFieldError('editEmbedProfileName') }">
                  <span>平台名称</span>
                  <input v-model="embedEditName" class="field-input" type="text" />
                  <div v-if="getFieldError('editEmbedProfileName')" class="field-error-text">{{ getFieldError("editEmbedProfileName") }}</div>
                </label>
                <label class="field" :class="{ 'has-error': getFieldError('editEmbedScriptUrl') }">
                  <span>embed.js 地址</span>
                  <input v-model="embedEditScriptUrl" class="field-input" type="text" />
                  <div v-if="getFieldError('editEmbedScriptUrl')" class="field-error-text">{{ getFieldError("editEmbedScriptUrl") }}</div>
                </label>
                <label class="field">
                  <span>备用脚本地址（可选）</span>
                  <input v-model="embedEditFallbackScriptUrl" class="field-input" type="text" />
                </label>
                <label class="field">
                  <span>viewerPath</span>
                  <input v-model="embedEditViewerPath" class="field-input" type="text" />
                </label>
                <label class="field">
                  <span>构造器名称</span>
                  <input v-model="embedEditConstructorName" class="field-input" type="text" />
                </label>
                <label class="field">
                  <span>资源 URL 参数键</span>
                  <input v-model="embedEditAssetUrlOptionKey" class="field-input" type="text" />
                </label>
                <label class="field">
                  <span>允许扩展名（逗号分隔）</span>
                  <input v-model="embedEditExtensionsText" class="field-input" type="text" />
                </label>
                <label class="field" :class="{ 'has-error': getFieldError('editEmbedDefaultOptionsJson') }">
                  <span>默认参数 JSON</span>
                  <textarea v-model="embedEditDefaultOptionsJson" class="field-input" rows="4" />
                  <div v-if="getFieldError('editEmbedDefaultOptionsJson')" class="field-error-text">
                    {{ getFieldError("editEmbedDefaultOptionsJson") }}
                  </div>
                </label>
                <label class="field">
                  <span>
                    <input v-model="embedEditEnabled" type="checkbox" />
                    启用该平台
                  </span>
                </label>
                <div class="asset-actions-inline">
                  <button type="button" class="btn btn-primary" :disabled="savingEmbed" @click="saveEmbedProfileEdit">保存平台</button>
                  <button type="button" class="btn btn-ghost" :disabled="savingEmbed" @click="cancelEmbedProfileEdit">取消</button>
                </div>
              </div>
              <div v-else class="empty">在平台列表点击“编辑”后，可在此修改平台配置。</div>
            </div>
          </div>
        </div>

        <div class="recent-action-log">
          <button type="button" class="panel-section-toggle" @click="togglePanelSection('recent:log')">
            <span>最近操作记录</span>
            <span class="asset-meta">{{ isPanelSectionOpen("recent:log") ? "收起" : "展开" }}</span>
          </button>
          <div v-if="isPanelSectionOpen('recent:log')" class="recent-action-list">
            <div class="recent-action-tools">
              <select v-model="operationLogFilter" class="field-input operation-log-filter">
                <option value="all">全部</option>
                <option value="success">成功</option>
                <option value="error">失败</option>
                <option value="info">信息</option>
              </select>
              <button type="button" class="btn btn-ghost" :disabled="operationLogs.length === 0" @click="clearOperationLogs">
                清空记录
              </button>
            </div>
            <article v-for="item in filteredOperationLogs" :key="item.id" class="recent-action-item" :class="item.level">
              <div class="asset-meta">{{ item.message }}</div>
              <div class="asset-meta">{{ formatOperationTime(item.at) }}</div>
            </article>
            <div v-if="operationLogs.length === 0" class="empty">暂无操作记录。</div>
            <div v-else-if="filteredOperationLogs.length === 0" class="empty">当前筛选条件下暂无记录。</div>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="feedback" class="admin-feedback" :class="{ error: feedbackError, success: !feedbackError }">{{ feedback }}</div>
  </section>
</template>

<style scoped>
.admin-library-view {
  display: grid;
  gap: 12px;
}

.library-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.library-subtitle {
  font-size: 13px;
  color: var(--muted);
}

.library-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-chip {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--muted);
  background: color-mix(in srgb, var(--surface) 88%, var(--bg));
}

.library-workbench.library-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(360px, 1.3fr) minmax(360px, 1.3fr);
  gap: 12px;
  align-items: start;
}

.library-column {
  display: grid;
  gap: 10px;
}

.library-column-left,
.library-column-middle,
.library-column-right {
  min-height: 200px;
}

.column-head {
  display: grid;
  gap: 2px;
}

.column-divider {
  height: 1px;
  background: var(--border);
  margin: 2px 0 6px;
}

.library-panel-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.panel-tab {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface) 90%, var(--bg));
  color: var(--muted);
  padding: 6px 8px;
  font-size: 12px;
  cursor: pointer;
}

.panel-tab.active {
  color: var(--text);
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
  background: color-mix(in srgb, var(--primary) 14%, var(--surface));
}

.panel-content {
  display: grid;
  gap: 8px;
}

.panel-section {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  background: color-mix(in srgb, var(--surface) 94%, var(--bg));
}

.panel-section-toggle {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  cursor: pointer;
  text-align: left;
  font-weight: 600;
}

.panel-section-body {
  margin-top: 8px;
  display: grid;
  gap: 8px;
}

.field.has-error .field-input {
  border-color: color-mix(in srgb, var(--danger) 55%, var(--border));
}

.field-error-text {
  font-size: 12px;
  color: var(--danger);
  line-height: 1.35;
}

.asset-filter-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.asset-batch-toolbar {
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  background: color-mix(in srgb, var(--surface) 90%, var(--bg));
}

.asset-batch-result {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  display: grid;
  gap: 4px;
  background: color-mix(in srgb, var(--surface) 94%, var(--bg));
}

.batch-select-all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}

.batch-move-folder {
  min-width: 150px;
}

.folder-list,
.asset-list {
  display: grid;
  gap: 8px;
}

.asset-list-head {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  gap: 8px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.deleted-assets-list {
  border-top: 1px dashed var(--border);
  padding-top: 8px;
  display: grid;
  gap: 8px;
}

.recent-action-log {
  border-top: 1px dashed var(--border);
  padding-top: 8px;
  display: grid;
  gap: 8px;
}

.recent-action-list {
  display: grid;
  gap: 6px;
}

.recent-action-tools {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.operation-log-filter {
  min-width: 140px;
}

.recent-action-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  display: grid;
  gap: 2px;
  background: color-mix(in srgb, var(--surface) 96%, var(--bg));
}

.recent-action-item.success {
  border-color: color-mix(in srgb, #16a34a 44%, var(--border));
}

.recent-action-item.error {
  border-color: color-mix(in srgb, #dc2626 44%, var(--border));
}

.recent-action-item.info {
  border-color: color-mix(in srgb, #2563eb 34%, var(--border));
}

.editor-panel {
  margin-top: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 8px;
  background: color-mix(in srgb, var(--surface) 94%, var(--bg));
}

.folder-item,
.asset-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface) 92%, var(--bg));
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.asset-item.selected {
  border-color: color-mix(in srgb, var(--primary) 68%, var(--border));
  background: color-mix(in srgb, var(--primary) 8%, var(--surface));
}

.asset-select-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.asset-select-checkbox {
  width: 16px;
  height: 16px;
}

.asset-main {
  display: grid;
  gap: 2px;
}

.asset-actions-inline {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.btn-danger {
  border-color: color-mix(in srgb, #dc2626 52%, var(--border));
  color: #b91c1c;
}

.folder-item.active {
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
}

.folder-pick {
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  padding: 0;
  cursor: pointer;
  flex: 1;
}

.folder-name,
.asset-name {
  font-weight: 600;
}

.folder-meta,
.asset-meta,
.selected-folder {
  font-size: 13px;
  color: var(--muted);
}

.empty {
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 12px;
  color: var(--muted);
  font-size: 13px;
}

@media (max-width: 1200px) {
  .library-workbench.library-grid {
    grid-template-columns: minmax(260px, 1fr) minmax(340px, 1.2fr);
  }

  .library-column-right {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .library-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .library-workbench.library-grid {
    grid-template-columns: 1fr;
  }

  .asset-filter-row {
    grid-template-columns: 1fr;
  }

  .asset-list-head {
    display: none;
  }
}
</style>
