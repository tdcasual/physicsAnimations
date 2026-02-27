export type LibraryCoverType = "blank" | "image";
export type LibraryOpenMode = "embed" | "download";
export type LibraryAssetStatus = "ready" | "failed";

export interface LibraryFolder {
  id: string;
  name: string;
  categoryId: string;
  coverType: LibraryCoverType;
  coverPath: string;
  parentId?: string | null;
  order?: number;
  assetCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LibraryAsset {
  id: string;
  folderId: string;
  adapterKey: string;
  displayName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  openMode: LibraryOpenMode;
  generatedEntryPath: string;
  embedProfileId: string;
  embedOptions: Record<string, unknown>;
  status: LibraryAssetStatus;
  deleted: boolean;
  deletedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LibraryEmbedProfile {
  id: string;
  name: string;
  scriptUrl: string;
  fallbackScriptUrl: string;
  viewerPath: string;
  remoteScriptUrl: string;
  remoteViewerPath: string;
  syncMode: string;
  syncStatus: string;
  syncMessage: string;
  lastSyncAt: string;
  constructorName: string;
  assetUrlOptionKey: string;
  matchExtensions: string[];
  defaultOptions: Record<string, unknown>;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LibraryCatalogResponse {
  folders: LibraryFolder[];
}

export interface LibraryFolderAssetsResponse {
  assets: LibraryAsset[];
}

export interface LibraryAssetOpenInfo {
  ok: boolean;
  mode: LibraryOpenMode;
  openUrl: string;
  downloadUrl: string;
  asset: LibraryAsset;
}
