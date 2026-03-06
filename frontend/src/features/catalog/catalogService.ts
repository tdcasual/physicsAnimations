import type { CatalogData } from "./types";

export const DEFAULT_GROUP_ID = "physics";

function safeText(text: unknown): string {
  return typeof text === "string" ? text : "";
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
          title: "学科",
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
    return { groups: {} };
  }
}
