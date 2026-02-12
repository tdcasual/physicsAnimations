export interface TaxonomyGroup {
  id: string;
  title: string;
  order?: number;
  hidden?: boolean;
  count?: number;
  categoryCount?: number;
}

export interface TaxonomyCategory {
  id: string;
  groupId: string;
  title: string;
  order?: number;
  hidden?: boolean;
  count?: number;
  builtinCount?: number;
  dynamicCount?: number;
}

export interface TaxonomySelection {
  kind: "group" | "category";
  id: string;
}

export interface TaxonomyTreeNode {
  group: TaxonomyGroup;
  visibleCategories: TaxonomyCategory[];
  shownCategories: TaxonomyCategory[];
  groupMatches: boolean;
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizedQuery(input: string): string {
  return safeText(input).trim().toLowerCase();
}

function matchesQuery(query: string, id: string, title: string): boolean {
  if (!query) return true;
  return safeText(id).toLowerCase().includes(query) || safeText(title).toLowerCase().includes(query);
}

export function sortGroupList(groups: TaxonomyGroup[]): TaxonomyGroup[] {
  return [...(Array.isArray(groups) ? groups : [])].sort((a, b) => {
    const orderDiff = Number(b?.order || 0) - Number(a?.order || 0);
    if (orderDiff) return orderDiff;
    return safeText(a?.title).localeCompare(safeText(b?.title), "zh-CN");
  });
}

export function sortCategoryList(categories: TaxonomyCategory[]): TaxonomyCategory[] {
  return [...(Array.isArray(categories) ? categories : [])].sort((a, b) => {
    const orderDiff = Number(b?.order || 0) - Number(a?.order || 0);
    if (orderDiff) return orderDiff;
    return safeText(a?.title).localeCompare(safeText(b?.title), "zh-CN");
  });
}

export function buildTaxonomyTree(params: {
  groups: TaxonomyGroup[];
  categories: TaxonomyCategory[];
  search: string;
  showHidden: boolean;
}): {
  groups: TaxonomyTreeNode[];
  renderedGroupCount: number;
  renderedCategoryCount: number;
} {
  const query = normalizedQuery(params.search);
  const showHidden = params.showHidden === true;
  const sortedGroups = sortGroupList(params.groups || []);
  const sortedCategories = sortCategoryList(params.categories || []);

  const categoriesByGroup = new Map<string, TaxonomyCategory[]>();
  for (const category of sortedCategories) {
    const groupId = safeText(category?.groupId).trim();
    if (!groupId) continue;
    if (!categoriesByGroup.has(groupId)) categoriesByGroup.set(groupId, []);
    categoriesByGroup.get(groupId)!.push(category);
  }

  const out: TaxonomyTreeNode[] = [];
  let renderedCategoryCount = 0;

  for (const group of sortedGroups) {
    if (!showHidden && group.hidden === true) continue;

    const groupId = safeText(group.id).trim();
    const groupTitle = safeText(group.title);
    const allInGroup = categoriesByGroup.get(groupId) || [];
    const visibleCategories = allInGroup.filter((category) => showHidden || category.hidden !== true);
    const groupMatches = matchesQuery(query, groupId, groupTitle);
    const shownCategories = query && !groupMatches
      ? visibleCategories.filter((category) =>
          matchesQuery(query, safeText(category.id), safeText(category.title)),
        )
      : visibleCategories;

    if (query && !groupMatches && shownCategories.length === 0) continue;

    renderedCategoryCount += shownCategories.length;
    out.push({
      group,
      visibleCategories,
      shownCategories,
      groupMatches,
    });
  }

  return {
    groups: out,
    renderedGroupCount: out.length,
    renderedCategoryCount,
  };
}

export function normalizeTaxonomySelection(params: {
  selection: TaxonomySelection | null | undefined;
  groups: TaxonomyGroup[];
  categories: TaxonomyCategory[];
  showHidden: boolean;
  fallbackGroupId: string;
}): TaxonomySelection | null {
  const showHidden = params.showHidden === true;
  const sortedGroups = sortGroupList(params.groups || []);
  const visibleGroups = sortedGroups.filter((group) => showHidden || group.hidden !== true);
  const groupIds = new Set(visibleGroups.map((group) => safeText(group.id).trim()).filter(Boolean));
  const categoryMap = new Map<string, TaxonomyCategory>();

  for (const category of params.categories || []) {
    const id = safeText(category?.id).trim();
    if (!id) continue;
    if (!showHidden && category.hidden === true) continue;
    if (!groupIds.has(safeText(category.groupId).trim())) continue;
    categoryMap.set(id, category);
  }

  const fallback =
    (groupIds.has(params.fallbackGroupId) ? params.fallbackGroupId : "") ||
    visibleGroups[0]?.id ||
    sortedGroups[0]?.id ||
    "";

  if (!fallback) return null;

  const selection = params.selection;
  if (!selection || (selection.kind !== "group" && selection.kind !== "category")) {
    return { kind: "group", id: fallback };
  }

  if (selection.kind === "group") {
    return groupIds.has(selection.id) ? selection : { kind: "group", id: fallback };
  }

  const category = categoryMap.get(selection.id);
  if (!category) {
    return { kind: "group", id: fallback };
  }

  return selection;
}
