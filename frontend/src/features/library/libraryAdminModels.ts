export interface CategoryRow {
  id: string;
  groupId: string;
  title: string;
}

export interface GroupRow {
  id: string;
  title: string;
}

export type LibraryPanelTab = "folder" | "asset" | "embed";
export type AssetSortMode = "updated_desc" | "updated_asc" | "name_asc" | "name_desc";

export interface AssetBatchResult {
  actionLabel: string;
  successIds: string[];
  failed: Array<{ id: string; reason: string }>;
}

export type OperationLogLevel = "success" | "error" | "info";

export interface OperationLogEntry {
  id: string;
  message: string;
  level: OperationLogLevel;
  at: string;
}

export type JsonObjectParseResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false };
