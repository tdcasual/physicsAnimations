import { computed, ref } from "vue";
import {
  buildTaxonomyTree,
  sortGroupList,
  type TaxonomyCategory,
  type TaxonomyGroup,
  type TaxonomySelection,
} from "../taxonomyUiState";

type GroupRow = TaxonomyGroup;
type CategoryRow = TaxonomyCategory;

type TaxonomyAdminDraftStateDeps = {
  defaultGroupId: string;
};

export function useTaxonomyAdminDraftState(deps: TaxonomyAdminDraftStateDeps) {
  const loading = ref(false);
  const saving = ref(false);
  const errorText = ref("");
  const actionFeedback = ref("");
  const actionFeedbackError = ref(false);

  const groups = ref<GroupRow[]>([]);
  const categories = ref<CategoryRow[]>([]);

  const searchQuery = ref("");
  const showHidden = ref(false);
  const openGroupIds = ref<string[]>([deps.defaultGroupId]);
  const selection = ref<TaxonomySelection | null>(null);

  const groupFormTitle = ref("");
  const groupFormOrder = ref(0);
  const groupFormHidden = ref(false);

  const createGroupId = ref("");
  const createGroupTitle = ref("");
  const createGroupOrder = ref(0);
  const createGroupHidden = ref(false);

  const createCategoryId = ref("");
  const createCategoryTitle = ref("");
  const createCategoryOrder = ref(0);
  const createCategoryHidden = ref(false);

  const categoryFormGroupId = ref(deps.defaultGroupId);
  const categoryFormTitle = ref("");
  const categoryFormOrder = ref(0);
  const categoryFormHidden = ref(false);

  const tree = computed(() =>
    buildTaxonomyTree({
      groups: groups.value,
      categories: categories.value,
      search: searchQuery.value,
      showHidden: showHidden.value,
    }),
  );

  const visibleGroups = computed(() => sortGroupList(groups.value).filter((group) => showHidden.value || group.hidden !== true));
  const allSortedGroups = computed(() => sortGroupList(groups.value));
  const groupById = computed(() => new Map(groups.value.map((group) => [group.id, group])));
  const categoryById = computed(() => new Map(categories.value.map((category) => [category.id, category])));

  const fallbackGroupId = computed(
    () =>
      visibleGroups.value[0]?.id ||
      allSortedGroups.value[0]?.id ||
      groups.value[0]?.id ||
      deps.defaultGroupId,
  );

  const selectedGroup = computed(() => {
    if (!selection.value || selection.value.kind !== "group") return null;
    return groupById.value.get(selection.value.id) || null;
  });

  const selectedCategory = computed(() => {
    if (!selection.value || selection.value.kind !== "category") return null;
    return categoryById.value.get(selection.value.id) || null;
  });

  const selectedCreateGroupId = computed(() => {
    if (selectedGroup.value) return selectedGroup.value.id;
    if (selectedCategory.value) return selectedCategory.value.groupId;
    return fallbackGroupId.value;
  });

  const taxonomyMetaText = computed(() => {
    if (searchQuery.value.trim()) {
      return `匹配：大类 ${tree.value.renderedGroupCount} · 二级分类 ${tree.value.renderedCategoryCount}`;
    }
    return `大类 ${tree.value.renderedGroupCount} · 二级分类 ${tree.value.renderedCategoryCount}`;
  });

  const canDeleteSelectedCategory = computed(() => Number(selectedCategory.value?.count || 0) === 0);

  return {
    loading,
    saving,
    errorText,
    actionFeedback,
    actionFeedbackError,
    groups,
    categories,
    searchQuery,
    showHidden,
    openGroupIds,
    selection,
    groupFormTitle,
    groupFormOrder,
    groupFormHidden,
    createGroupId,
    createGroupTitle,
    createGroupOrder,
    createGroupHidden,
    createCategoryId,
    createCategoryTitle,
    createCategoryOrder,
    createCategoryHidden,
    categoryFormGroupId,
    categoryFormTitle,
    categoryFormOrder,
    categoryFormHidden,
    tree,
    visibleGroups,
    allSortedGroups,
    groupById,
    categoryById,
    fallbackGroupId,
    selectedGroup,
    selectedCategory,
    selectedCreateGroupId,
    taxonomyMetaText,
    canDeleteSelectedCategory,
  };
}
