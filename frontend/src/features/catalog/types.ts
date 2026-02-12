export type CatalogItemType = "builtin" | "upload" | "link" | string;

export interface CatalogItem {
  id: string;
  type: CatalogItemType;
  categoryId: string;
  title: string;
  description: string;
  href: string;
  src: string;
  thumbnail: string;
  order?: number;
}

export interface CatalogCategory {
  id: string;
  groupId: string;
  title: string;
  order?: number;
  hidden?: boolean;
  items: CatalogItem[];
}

export interface CatalogGroup {
  id: string;
  title: string;
  order?: number;
  hidden?: boolean;
  categories: Record<string, CatalogCategory>;
}

export interface CatalogData {
  groups: Record<string, CatalogGroup>;
}
