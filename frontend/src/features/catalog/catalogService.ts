import type { CatalogData, CatalogItem } from "./types";

export const DEFAULT_GROUP_ID = "physics";

function safeText(text: unknown): string {
  return typeof text === "string" ? text : "";
}

function buildBuiltinItem(params: { categoryId: string; item: Record<string, unknown> }): CatalogItem {
  const file = safeText(params.item.file);
  const thumbnail = safeText(params.item.thumbnail);
  return {
    id: file,
    type: "builtin",
    categoryId: params.categoryId,
    title: safeText(params.item.title || file.replace(/\.html$/i, "")),
    description: safeText(params.item.description),
    src: `animations/${file}`,
    href: `animations/${file}`,
    thumbnail,
    order: 0,
  };
}

async function loadBuiltinCatalog(): Promise<CatalogData> {
  const response = await fetch("/animations.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = (await response.json()) as Record<string, { title?: string; items?: Record<string, unknown>[] }>;

  const categories: Record<string, any> = {};
  for (const [categoryId, category] of Object.entries(data || {})) {
    categories[categoryId] = {
      id: categoryId,
      groupId: DEFAULT_GROUP_ID,
      title: safeText(category?.title || categoryId),
      order: 0,
      hidden: false,
      items: (category?.items || []).map((item) => buildBuiltinItem({ categoryId, item })),
    };
  }

  return {
    groups: {
      [DEFAULT_GROUP_ID]: {
        id: DEFAULT_GROUP_ID,
        title: "物理",
        order: 0,
        hidden: false,
        categories,
      },
    },
  };
}

export function normalizeCatalog(catalog: any): CatalogData {
  if (catalog?.groups && typeof catalog.groups === "object") {
    return catalog as CatalogData;
  }

  if (catalog?.categories && typeof catalog.categories === "object") {
    const categories: Record<string, any> = {};
    for (const [id, category] of Object.entries(catalog.categories)) {
      if (!category || typeof category !== "object") continue;
      const row = category as Record<string, unknown>;
      categories[id] = {
        ...row,
        id: safeText(row.id || id) || id,
        groupId: safeText(row.groupId || DEFAULT_GROUP_ID) || DEFAULT_GROUP_ID,
        title: safeText(row.title || id) || id,
        items: Array.isArray(row.items) ? row.items : [],
      };
    }
    return {
      groups: {
        [DEFAULT_GROUP_ID]: {
          id: DEFAULT_GROUP_ID,
          title: "物理",
          order: 0,
          hidden: false,
          categories,
        },
      },
    };
  }

  return { groups: {} };
}

export async function loadCatalogData(): Promise<CatalogData> {
  try {
    const response = await fetch("/api/catalog", { method: "GET", cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return normalizeCatalog(await response.json());
  } catch {
    return normalizeCatalog(await loadBuiltinCatalog());
  }
}
