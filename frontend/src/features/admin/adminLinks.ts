import { normalizePublicUrl } from "../catalog/catalogLink";

export function buildViewerHref(id: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/+$/, "/")}viewer/${encodeURIComponent(id)}`;
}

export function buildPreviewHref(item: { src?: string; id: string }): string {
  return normalizePublicUrl(item.src || buildViewerHref(item.id));
}
