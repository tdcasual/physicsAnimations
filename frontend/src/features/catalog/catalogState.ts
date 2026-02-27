import { DEFAULT_GROUP_ID } from "./catalogService";
import type { CatalogCategory, CatalogData, CatalogGroup, CatalogItem } from "./types";

function safeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function sortByOrderAndTitle<T extends { order?: number; title?: string }>(list: T[]): T[] {
  const out = [...(list || [])];
  out.sort((a, b) => {
    const orderDiff = (Number(b?.order || 0) - Number(a?.order || 0));
    if (orderDiff) return orderDiff;
    return safeText(a?.title).localeCompare(safeText(b?.title), "zh-CN");
  });
  return out;
}

export interface CatalogViewInput {
  catalog: CatalogData;
  selectedGroupId: string;
  selectedCategoryId: string;
  query: string;
}

export interface CatalogViewState {
  groups: CatalogGroup[];
  activeGroupId: string;
  categories: CatalogCategory[];
  activeCategoryId: string;
  items: CatalogItem[];
  hasAnyItems: boolean;
}

export interface CategoryScopedFolder {
  categoryId: string;
  name?: string;
}

export interface FolderFilterInput<T extends CategoryScopedFolder> {
  folders: T[];
  activeCategoryId: string;
  activeGroupCategoryIds: ReadonlySet<string>;
  query: string;
}

export function filterFoldersByCatalogContext<T extends CategoryScopedFolder>(
  input: FolderFilterInput<T>,
): T[] {
  const q = safeText(input.query).trim().toLowerCase();
  return (input.folders || []).filter((folder) => {
    const categoryId = safeText(folder.categoryId);
    if (!input.activeGroupCategoryIds.has(categoryId)) return false;
    if (input.activeCategoryId !== "all" && categoryId !== input.activeCategoryId) return false;
    if (!q) return true;
    const hay = `${safeText(folder.name)}\n${categoryId}`.toLowerCase();
    return hay.includes(q);
  });
}

export function computeCatalogView(input: CatalogViewInput): CatalogViewState {
  const groups = sortByOrderAndTitle(Object.values(input.catalog?.groups || {}));
  const fallbackGroupId = groups[0]?.id || DEFAULT_GROUP_ID;
  const activeGroupId = groups.some((group) => group.id === input.selectedGroupId)
    ? input.selectedGroupId
    : fallbackGroupId;
  const activeGroup = (input.catalog?.groups || {})[activeGroupId] || groups[0] || null;

  const categories = sortByOrderAndTitle(Object.values(activeGroup?.categories || {}));
  const categoryIds = new Set(categories.map((category) => category.id));
  const activeCategoryId =
    input.selectedCategoryId === "all" || categoryIds.has(input.selectedCategoryId)
      ? input.selectedCategoryId
      : "all";

  const allGroupItems = activeGroup ? Object.values(activeGroup.categories || {}).flatMap((category) => category.items || []) : [];
  const hasAnyItems = allGroupItems.length > 0;

  const q = safeText(input.query).trim().toLowerCase();
  const items = allGroupItems.filter((item) => {
    const matchesCategory = activeCategoryId === "all" || item.categoryId === activeCategoryId;
    const title = safeText(item.title).toLowerCase();
    const description = safeText(item.description).toLowerCase();
    const matchesQuery = !q || title.includes(q) || description.includes(q);
    return matchesCategory && matchesQuery;
  });

  return {
    groups,
    activeGroupId,
    categories,
    activeCategoryId,
    items,
    hasAnyItems,
  };
}
