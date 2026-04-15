export interface AdminApiError extends Error {
  status: number;
  code: string;
  data?: Record<string, unknown> | null;
  details?: Record<string, unknown>;
}

export interface AdminItemRow {
  id: string;
  type: string;
  categoryId: string;
  title: string;
  description: string;
  thumbnail?: string;
  src?: string;
  order?: number;
  published?: boolean;
  hidden?: boolean;
  deleted?: boolean;
}

export interface AdminItemsResponse {
  page: number;
  pageSize: number;
  total: number;
  items: AdminItemRow[];
}

