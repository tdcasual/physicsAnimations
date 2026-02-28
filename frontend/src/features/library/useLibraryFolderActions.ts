import { computed, ref, type ComputedRef, type Ref } from "vue";
import { listTaxonomy } from "../admin/adminApi";
import { createLibraryFolder, deleteLibraryFolder, updateLibraryFolder, uploadLibraryFolderCover } from "./libraryApi";
import type { CategoryRow, GroupRow, LibraryPanelTab } from "./libraryAdminModels";
import type { LibraryFolder } from "./types";

type UseLibraryFolderActionsDeps = {
  savingFolder: Ref<boolean>;
  selectedFolderId: Ref<string>;
  selectedFolder: ComputedRef<LibraryFolder | null>;
  reloadFolders: () => Promise<void>;
  reloadFolderAssets: () => Promise<void>;
  setActivePanelTab: (tab: LibraryPanelTab) => void;
  setFeedback: (message: string, isError?: boolean) => void;
  setFieldError: (key: string, message: string) => void;
  clearFieldErrors: (...keys: string[]) => void;
};

export function useLibraryFolderActions(deps: UseLibraryFolderActionsDeps) {
  const categories = ref<CategoryRow[]>([]);
  const groups = ref<GroupRow[]>([]);

  const folderName = ref("");
  const folderCategoryId = ref("other");
  const createCoverFile = ref<File | null>(null);
  const folderEditName = ref("");
  const folderEditCategoryId = ref("other");
  const coverFile = ref<File | null>(null);

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

  function syncFolderEditDraft() {
    const folder = deps.selectedFolder.value;
    if (!folder) {
      folderEditName.value = "";
      folderEditCategoryId.value = groupedCategoryOptions.value[0]?.value || "other";
      return;
    }
    folderEditName.value = folder.name || "";
    folderEditCategoryId.value = folder.categoryId || groupedCategoryOptions.value[0]?.value || "other";
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

  function onCreateCoverFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    createCoverFile.value = target.files?.[0] || null;
  }

  function onCoverFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    coverFile.value = target.files?.[0] || null;
  }

  async function createFolderEntry() {
    deps.clearFieldErrors("createFolderName");
    const name = folderName.value.trim();
    if (!name) {
      deps.setFieldError("createFolderName", "请填写文件夹名称。");
      deps.setFeedback("请填写文件夹名称。", true);
      return;
    }
    deps.savingFolder.value = true;
    deps.setFeedback("");
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
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      deps.setActivePanelTab("folder");
      deps.clearFieldErrors("createFolderName");
      deps.setFeedback("文件夹已创建。");
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.data?.error === "cover_invalid_type") {
        deps.setFeedback("封面仅支持图片类型。", true);
        return;
      }
      deps.setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "创建文件夹失败。", true);
    } finally {
      deps.savingFolder.value = false;
    }
  }

  async function saveFolderMeta() {
    deps.clearFieldErrors("editFolderName");
    if (!deps.selectedFolderId.value) {
      deps.setFeedback("请先选择文件夹。", true);
      return;
    }
    const name = folderEditName.value.trim();
    if (!name) {
      deps.setFieldError("editFolderName", "文件夹名称不能为空。");
      deps.setFeedback("文件夹名称不能为空。", true);
      return;
    }
    deps.savingFolder.value = true;
    deps.setFeedback("");
    try {
      await updateLibraryFolder(deps.selectedFolderId.value, {
        name,
        categoryId: folderEditCategoryId.value.trim() || "other",
      });
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      deps.setActivePanelTab("folder");
      deps.clearFieldErrors("editFolderName");
      deps.setFeedback("文件夹信息已更新。");
    } catch (err) {
      const e = err as { status?: number };
      deps.setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "更新文件夹失败。", true);
    } finally {
      deps.savingFolder.value = false;
    }
  }

  async function uploadCover() {
    if (!deps.selectedFolderId.value) {
      deps.setFeedback("请先选择文件夹。", true);
      return;
    }
    if (!coverFile.value) {
      deps.setFeedback("请选择封面图片。", true);
      return;
    }
    deps.savingFolder.value = true;
    deps.setFeedback("");
    try {
      await uploadLibraryFolderCover({
        folderId: deps.selectedFolderId.value,
        file: coverFile.value,
      });
      coverFile.value = null;
      const input = document.querySelector<HTMLInputElement>("#library-cover-file");
      if (input) input.value = "";
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      deps.setActivePanelTab("folder");
      deps.setFeedback("封面上传成功。");
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.status === 401) {
        deps.setFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "cover_invalid_type") {
        deps.setFeedback("封面仅支持图片类型。", true);
        return;
      }
      deps.setFeedback("封面上传失败。", true);
    } finally {
      deps.savingFolder.value = false;
    }
  }

  async function removeFolder(folderId: string) {
    if (!window.confirm("确定删除该文件夹吗？")) return;
    deps.savingFolder.value = true;
    deps.setFeedback("");
    try {
      await deleteLibraryFolder(folderId);
      if (deps.selectedFolderId.value === folderId) deps.selectedFolderId.value = "";
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      deps.setFeedback("文件夹已删除。");
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } };
      if (e?.status === 401) {
        deps.setFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "folder_not_empty") {
        deps.setFeedback("文件夹非空，需先删除其中资源。", true);
        return;
      }
      deps.setFeedback("删除文件夹失败。", true);
    } finally {
      deps.savingFolder.value = false;
    }
  }

  return {
    categories,
    groups,
    folderName,
    folderCategoryId,
    createCoverFile,
    folderEditName,
    folderEditCategoryId,
    coverFile,
    groupedCategoryOptions,
    syncFolderEditDraft,
    syncCategorySelection,
    syncFolderEditCategorySelection,
    reloadTaxonomy,
    onCreateCoverFileChange,
    onCoverFileChange,
    createFolderEntry,
    saveFolderMeta,
    uploadCover,
    removeFolder,
  };
}
