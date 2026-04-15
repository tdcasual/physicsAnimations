import type { CatalogData, CatalogCategory } from "./types";

export const DEFAULT_GROUP_ID = "physics";

export interface CatalogLoadSuccess {
  ok: true;
  catalog: CatalogData;
}

export interface CatalogLoadFailure {
  ok: false;
  catalog: CatalogData;
  error: "request_failed";
}

export type CatalogLoadResult = CatalogLoadSuccess | CatalogLoadFailure;

function safeText(text: unknown): string {
  return typeof text === "string" ? text : "";
}

interface RawCatalogCategory {
  id?: unknown;
  groupId?: unknown;
  title?: unknown;
  items?: unknown;
  [key: string]: unknown;
}

interface RawCatalogData {
  groups?: Record<string, unknown>;
  categories?: Record<string, RawCatalogCategory>;
}

export function normalizeCatalog(catalog: RawCatalogData | null | undefined): CatalogData {
  if (catalog?.groups && typeof catalog.groups === "object") {
    return catalog as CatalogData;
  }

  if (catalog?.categories && typeof catalog.categories === "object") {
    const categories: Record<string, CatalogCategory> = {};
    for (const [id, category] of Object.entries(catalog.categories)) {
      if (!category || typeof category !== "object") continue;
      const row = category as Record<string, unknown>;
      categories[id] = {
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

export async function loadCatalogData(): Promise<CatalogLoadResult> {
  try {
    const response = await fetch("/api/catalog", { method: "GET", cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return {
      ok: true,
      catalog: normalizeCatalog(await response.json()),
    };
  } catch {
    return {
      ok: false,
      catalog: { groups: {} },
      error: "request_failed",
    };
  }
}
