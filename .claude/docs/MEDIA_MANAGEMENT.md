# Media Management System

**Location:** 
- Editor UI: `packages/builder-editor/src/panels/MediaManager.tsx`
- Core types: `packages/builder-core/src/document/assets.ts`
- Backend API: `apps/api/src/routes/media.routes.ts`

**Version:** 1.0 | **Last updated:** 2026-04

---

## Overview

The Media Management system provides a **unified interface for browsing, uploading, and selecting media assets** (images, videos, fonts, files) in the builder canvas. It's designed to be extensible via the `AssetProvider` interface so external services can be plugged in.

### Key Features

- **3-tab UI:** Library (browse existing assets), Upload (drag-and-drop file upload), URL (paste external links)
- **Live preview:** Image previews with thumbnails, file type icons for non-media
- **Upload progress:** Per-file progress tracking with status (pending → uploading → done/error)
- **Asset search & filter:** Search by name/ID, filter by type (image, video, font, file)
- **Metadata tracking:** Asset size, dimensions, MIME type, upload timestamp
- **Provider extensibility:** `AssetProvider` interface allows custom asset sources (cloud storage, CDN, etc.)

---

## Type Contracts

### Asset

```typescript
interface Asset {
  id: string;                              // Unique identifier
  type: "image" | "video" | "font" | "file" | "icon";
  name: string;                            // Human-readable name
  url: string;                             // Resolved URL (HTTP or data URL)
  thumbnailUrl?: string;                   // Thumbnail for gallery UI
  size?: number;                           // File size in bytes
  dimensions?: { width: number; height: number };
  mimeType?: string;                       // e.g. "image/png", "video/mp4"
  uploadedAt?: string;                     // ISO 8601 timestamp
  tags?: string[];                         // Searchable tags
  source: "local" | "url" | string;        // "local" = uploaded, "url" = pasted, or provider ID
}
```

### AssetType

```typescript
type AssetType = "image" | "video" | "font" | "icon" | "file";
```

### MediaRef

```typescript
/**
 * Reference to a media asset — used as the value type for image/video component props.
 * Can reference an asset from AssetManifest (assetId) or an external URL.
 */
interface MediaRef {
  assetId?: string;                        // ID in document's AssetManifest (if uploaded)
  url: string;                             // Always present — resolved from assetId or pasted
  alt?: string;                            // Alt text for accessibility
  width?: number;                          // Intrinsic width
  height?: number;                         // Intrinsic height
  focalPoint?: { x: number; y: number };   // 0–1 fractions for smart crop (default center)
}
```

### AssetManifest

```typescript
interface AssetManifest {
  version: string;                         // Semver, e.g. "1.0.0"
  assets: Asset[];                         // All uploaded/managed assets
}
```

Stored in `BuilderDocument.assets`.

### AssetQuery

```typescript
interface AssetQuery {
  type?: AssetType;                        // Filter by type
  search?: string;                         // Search by name/tags
  page?: number;                           // Pagination
  pageSize?: number;
  tags?: string[];                         // Filter by tags
}
```

### AssetListResult

```typescript
interface AssetListResult {
  assets: Asset[];
  total: number;                           // Total count (for pagination)
  page: number;
  pageSize: number;
}
```

### AssetProvider

```typescript
interface AssetProvider {
  id: string;                              // Unique provider ID, e.g. "aws-s3", "cloudinary"
  name: string;                            // Display name
  icon?: string;                           // Icon component or URL
  supportedTypes: AssetType[];             // What types this provider handles
  
  // Fetch assets matching query
  listAssets(query: AssetQuery): Promise<AssetListResult>;
  
  // Optional: upload a file
  upload?(file: Uploadable): Promise<Asset>;
  
  // Optional: delete an asset
  delete?(assetId: string): Promise<void>;
}
```

### Uploadable

```typescript
/**
 * Portable file-like type — no DOM dependency, compatible with browser File.
 * Used in builder-core for uploads.
 */
type Uploadable = {
  readonly name: string;
  readonly size: number;
  readonly type: string;  // MIME type
};
```

---

## MediaManager Component

**Location:** `packages/builder-editor/src/panels/MediaManager.tsx`

The `MediaManager` is a dialog component that wraps the full media browsing and upload flow.

### Props

```typescript
interface MediaManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];                         // Current asset library
  onSelect: (asset: Asset) => void;        // Called when user picks an asset
  onUpload?: (files: File[]) => Promise<Asset[]>;  // Upload handler
  onDelete?: (assetId: string) => void;    // Delete handler
  onUrlAdd?: (url: string, type: AssetType) => void;  // URL paste handler
  acceptTypes?: AssetType[];               // Filter available types (e.g. ["image", "video"])
}
```

### Usage in Editor

```tsx
const [mediaOpen, setMediaOpen] = useState(false);
const [assets, setAssets] = useState<Asset[]>([]);

return (
  <>
    <button onClick={() => setMediaOpen(true)}>Browse Media</button>
    
    <MediaManager
      open={mediaOpen}
      onOpenChange={setMediaOpen}
      assets={assets}
      onSelect={(asset) => {
        // User selected an asset — apply to image component
        dispatchCommand({
          type: "SET_NODE_PROP",
          nodeId: selectedNode.id,
          key: "src",
          value: asset.url,
        });
      }}
      onUpload={async (files) => {
        // Upload files and return Asset[]
        const response = await fetch("/api/media/upload", {
          method: "POST",
          body: new FormData({
            files: files,
          }),
        });
        const newAssets = await response.json();
        setAssets([...assets, ...newAssets]);
        return newAssets;
      }}
      onDelete={async (assetId) => {
        // Delete from backend
        await fetch(`/api/media/${assetId}`, { method: "DELETE" });
        setAssets(assets.filter(a => a.id !== assetId));
      }}
      acceptTypes={["image"]}  // Only show images for an Image component
    />
  </>
);
```

### Tabs

#### 1. Library Tab

- Displays all assets in a **responsive grid**
- **Search & filter:**
  - Text search by name or asset ID
  - Type filter dropdown (All / Image / Video / Font / File)
- **Selection:** Click an asset card to select it
- **Delete:** Hover to reveal delete button (if `onDelete` provided)
- **Pagination:** (optional) for large libraries

#### 2. Upload Tab

- **Drag-and-drop zone** — upload files by dragging into the area
- **File picker button** — traditional file input
- **Upload queue** — shows per-file progress:
  - Thumbnail for images, file icon for others
  - File size (KB/MB)
  - Status: pending → uploading (with progress bar) → done ✓ / error ✗
- **Sequential upload:** Files upload one by one so progress is visible
- **Auto-switch:** After all uploads complete, automatically switches to Library tab

#### 3. URL Tab

- **URL text input** — paste an external URL (e.g., from Unsplash, CDN)
- **Type auto-detection:**
  - `.jpg`/`.png`/`.webp`/`.svg`/`.gif` → type = "image"
  - `.mp4`/`.webm`/`.mov` → type = "video"
  - `.woff`/`.ttf`/`.otf` → type = "font"
  - Others → type = "file"
- **Add button** — calls `onUrlAdd(url, type)` and adds to library

---

## Backend API

**Location:** `apps/api/src/routes/media.routes.ts`

Express router handling media uploads, listing, and deletion.

### Storage

- **Files:** Stored in `apps/api/uploads/` directory
- **Metadata:** `apps/api/uploads/metadata.json` (JSON file with asset metadata)
- **Max file size:** 50 MB per file
- **Allowed types:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.avif`, `.mp4`, `.webm`, `.mov`, `.woff`, `.woff2`, `.ttf`, `.otf`

### Endpoints

#### POST `/api/media/upload`

Upload one or more files.

**Request:**
```
Content-Type: multipart/form-data
files: File[]  (up to 20 files)
```

**Response:**
```json
{
  "assets": [
    {
      "id": "uuid-1",
      "type": "image",
      "name": "photo.jpg",
      "url": "/uploads/photo_1234567890.jpg",
      "size": 204800,
      "mimeType": "image/jpeg",
      "uploadedAt": "2026-04-25T10:00:00Z",
      "source": "local"
    }
  ]
}
```

**Status Codes:**
- `200 OK` — uploads succeeded (check each asset's `id` to confirm)
- `400 Bad Request` — invalid file type or missing files
- `413 Payload Too Large` — file exceeds 50 MB
- `500 Internal Server Error` — disk write failure

#### GET `/api/media`

List all uploaded assets (with optional filtering).

**Query Parameters:**
```
type=image          // Filter by type
search=photo        // Search by name
tags=vacation       // Filter by tags
page=1
pageSize=20
```

**Response:**
```json
{
  "assets": [...],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

#### DELETE `/api/media/:assetId`

Delete an asset by ID.

**Response:**
```json
{ "success": true, "id": "uuid-1" }
```

**Status Codes:**
- `200 OK` — deleted
- `404 Not Found` — asset doesn't exist
- `500 Internal Server Error` — fs error

---

## Core Types in builder-core

**File:** `packages/builder-core/src/document/assets.ts`

All types are serializable and have **zero DOM dependencies** so they can be used in any environment (server-side rendering, node scripts, etc.).

---

## Integration Points

### 1. Image Component

The **Image** component uses `MediaRef` for its `src` prop when integrating with full media management:

```typescript
// In Image component propSchema:
{
  key: "src",
  label: "Image",
  type: "image",  // PropSchema type that triggers MediaManager on click
  required: true,
}

// Stores value as either:
// - Asset URL directly: "https://example.com/photo.jpg"
// - Or as MediaRef with assetId: { assetId: "uuid-1", url: "...", focalPoint: {...} }
```

### 2. Gallery Components

**GalleryGrid** and **GallerySlider** components support bulk asset selection via MediaManager.

### 3. ContextualToolbar

When an Image component is selected, the toolbar shows an **Image → Filter** button that opens the media picker.

---

## Asset Provider Pattern

To add a custom asset source (e.g., Cloudinary, AWS S3, Google Drive), implement `AssetProvider`:

```typescript
class CloudinaryProvider implements AssetProvider {
  id = "cloudinary";
  name = "Cloudinary";
  supportedTypes = ["image", "video"];

  async listAssets(query: AssetQuery): Promise<AssetListResult> {
    // Fetch from Cloudinary API
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image`,
      {
        params: { search: query.search, max_results: query.pageSize },
      }
    );
    const data = await response.json();
    return {
      assets: data.resources.map(r => ({
        id: r.public_id,
        type: "image",
        name: r.filename,
        url: r.secure_url,
        thumbnailUrl: r.secure_url.replace(/upload/, "upload/c_thumb,w_100"),
        size: r.bytes,
        dimensions: { width: r.width, height: r.height },
        source: "cloudinary",
      })),
      total: data.total_count,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    };
  }

  async upload(file: Uploadable): Promise<Asset> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
    const data = await response.json();
    return {
      id: data.public_id,
      type: "image",
      name: data.original_filename,
      url: data.secure_url,
      size: data.bytes,
      source: "cloudinary",
    };
  }
}
```

Then register with the builder:

```typescript
builder.registerAssetProvider(new CloudinaryProvider());
```

---

## Data Flow

### Upload Flow

```
User drops file
  ↓
MediaManager.handleDrop()
  ↓
setUploadQueue() — show in Upload tab with "pending" status
  ↓
For each file:
  - Mark as "uploading", show progress bar
  - Call onUpload(file)
    - POST /api/media/upload
    - Backend stores file, returns Asset[]
  - Mark as "done" ✓ or "error" ✗
  ↓
After all done, wait 900ms then:
  - setActiveTab("library") — switch to Library tab
  - clearUploadQueue()
  ↓
Library tab refreshes to show new assets
```

### Selection Flow

```
User opens MediaManager
  ↓
Browse Library tab (or Upload new, or paste URL)
  ↓
Click asset card to select
  ↓
Click "Confirm" button
  ↓
onSelect(asset) fired
  ↓
Consumer applies asset to component (e.g., set Image.src)
  ↓
Dialog closes
```

---

## Performance & Limits

- **Max file size:** 50 MB per file
- **Max upload concurrency:** 1 (sequential) — so progress is visible per file
- **Asset library limit:** No hard limit, but pagination recommended for > 100 assets
- **Search performance:** O(n) linear search (in-memory) — OK for < 1000 assets; optimize with backend indexing for larger libraries

---

## Security Considerations

- **File type whitelist:** Only `.jpg`, `.png`, `.gif`, `.webp`, `.svg`, `.avif`, `.mp4`, `.webm`, `.mov`, `.woff`, `.woff2`, `.ttf`, `.otf` allowed
- **Filename sanitization:** Non-alphanumeric chars replaced with `_`, limited to 40 chars base name
- **Storage:** Files stored outside web root by default (in `apps/api/uploads/`)
- **CORS:** Configure CORS headers if assets served from different domain

---

## Future Enhancements

- [ ] **Batch operations:** Select multiple assets for bulk delete/tag
- [ ] **Image optimization:** Auto-resize/compress on upload
- [ ] **Thumbnail generation:** Server-side thumbs for video
- [ ] **CDN integration:** Automatic upload to CDN on completion
- [ ] **Duplicate detection:** Hash-based deduplication
- [ ] **Trash/recovery:** Soft delete with recovery window
- [ ] **Asset versioning:** Track multiple versions of same asset
- [ ] **Smart crop UI:** Interactive focal point picker in MediaManager preview

