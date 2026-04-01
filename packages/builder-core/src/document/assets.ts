/**
 * Asset management type contracts.
 */

export type AssetType = "image" | "video" | "font" | "icon" | "file";

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  url: string;
  thumbnailUrl?: string;
  /** File size in bytes */
  size?: number;
  dimensions?: { width: number; height: number };
  mimeType?: string;
  uploadedAt?: string;
  tags?: string[];
  /** "local" | "url" | provider-id */
  source: "local" | "url" | string;
}

export interface AssetManifest {
  version: string;
  assets: Asset[];
}

export interface AssetQuery {
  type?: AssetType;
  search?: string;
  page?: number;
  pageSize?: number;
  tags?: string[];
}

export interface AssetListResult {
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
}

/** Portable file-like type — avoids DOM dependency in builder-core. Compatible with browser File. */
export type Uploadable = { readonly name: string; readonly size: number; readonly type: string };

export interface AssetProvider {
  id: string;
  name: string;
  icon?: string;
  supportedTypes: AssetType[];
  listAssets(query: AssetQuery): Promise<AssetListResult>;
  upload?(file: Uploadable): Promise<Asset>;
  delete?(assetId: string): Promise<void>;
}
