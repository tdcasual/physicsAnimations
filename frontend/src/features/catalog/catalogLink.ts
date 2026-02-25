import type { CatalogItem } from "./types";

export function normalizePublicUrl(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return "#";
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (value.startsWith("//")) return value;
  if (value.startsWith("/")) return value;
  return `/${value.replace(/^\.?\//, "")}`;
}

export function getCatalogItemHref(item: CatalogItem): string {
  return normalizePublicUrl(item.href || item.src || "#");
}
