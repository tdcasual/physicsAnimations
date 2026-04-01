import { computed, ref, type Ref } from "vue";

type EditableAdminItem = {
  id: string;
  title?: string;
  description?: string;
  categoryId?: string;
  order?: number;
  published?: boolean;
  hidden?: boolean;
};

type CreateAdminItemEditorStateParams<T extends EditableAdminItem> = {
  items: Ref<T[]>;
  defaultCategoryId: string;
  clearFieldErrors: (key?: string) => void;
  setActionFeedback: (text: string, isError?: boolean) => void;
};

function serializeItemSnapshot(item: EditableAdminItem | null | undefined, defaultCategoryId: string): string {
  if (!item) return "";
  return JSON.stringify({
    title: item.title || "",
    description: item.description || "",
    categoryId: item.categoryId || defaultCategoryId,
    order: Number(item.order || 0),
    published: item.published !== false,
    hidden: item.hidden === true,
  });
}

export function createAdminItemEditorState<T extends EditableAdminItem>(params: CreateAdminItemEditorStateParams<T>) {
  const editingId = ref("");
  const editTitle = ref("");
  const editDescription = ref("");
  const editCategoryId = ref(params.defaultCategoryId);
  const editOrder = ref(0);
  const editPublished = ref(true);
  const editHidden = ref(false);
  const editingSnapshot = ref<T | null>(null);

  const selectedItem = computed(() => params.items.value.find((item) => item.id === editingId.value) || editingSnapshot.value || null);
  const loadedEditSnapshot = computed(() => serializeItemSnapshot(editingSnapshot.value, params.defaultCategoryId));
  const hasPendingEditChanges = computed(() => (editingSnapshot.value ? buildEditSnapshot() !== loadedEditSnapshot.value : false));

  function buildEditSnapshot(): string {
    return JSON.stringify({
      title: editTitle.value,
      description: editDescription.value,
      categoryId: editCategoryId.value,
      order: Number(editOrder.value || 0),
      published: editPublished.value,
      hidden: editHidden.value,
    });
  }

  function confirmDiscardPendingEdit(): boolean {
    if (!editingId.value || !editingSnapshot.value || !hasPendingEditChanges.value) return true;
    return window.confirm("当前编辑内容有未保存更改，确定切换吗？");
  }

  function resetEdit() {
    editingId.value = "";
    editingSnapshot.value = null;
    editTitle.value = "";
    editDescription.value = "";
    editCategoryId.value = params.defaultCategoryId;
    editOrder.value = 0;
    editPublished.value = true;
    editHidden.value = false;
    params.clearFieldErrors("editTitle");
  }

  function beginEdit(item: T, options: { force?: boolean } = {}) {
    if (item.id === editingId.value && !options.force) return;
    if (!options.force && !confirmDiscardPendingEdit()) return;

    editingId.value = item.id;
    editingSnapshot.value = item;
    editTitle.value = item.title || "";
    editDescription.value = item.description || "";
    editCategoryId.value = item.categoryId || params.defaultCategoryId;
    editOrder.value = Number(item.order || 0);
    editPublished.value = item.published !== false;
    editHidden.value = item.hidden === true;
    params.setActionFeedback("");
  }

  function syncEditStateWithItems() {
    const currentId = editingId.value;
    if (!currentId) return;
    const currentItem = params.items.value.find((item) => item.id === currentId);
    if (currentItem) {
      editingSnapshot.value = currentItem;
    }
  }

  return {
    editingId,
    editTitle,
    editDescription,
    editCategoryId,
    editOrder,
    editPublished,
    editHidden,
    editingSnapshot,
    selectedItem,
    hasPendingEditChanges,
    beginEdit,
    resetEdit,
    syncEditStateWithItems,
  };
}
