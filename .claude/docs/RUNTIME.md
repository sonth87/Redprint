# Runtime & Content Loading

Reference for rendering pipeline, dynamic component loading, asset management, and import/export.

---

## Rendering System

### Editor Rendering

Two separate layers:

**Document Layer** — renders actual component tree using `editorRenderer`. This is the WYSIWYG canvas.

**Overlay Layer** — renders selection, resize handles, hover highlights, drag targets, helper lines, snap guides, drop indicators. Position: `absolute` on top.

### Runtime Rendering

Runtime renderer must:

- Resolve component from registry
- Apply style merge: base + responsive per breakpoint
- Bind interactions
- Render via `runtimeRenderer`
- Exclude editor code from bundle

### Rendering Pipeline

```
Document
  → Node tree traversal (depth-first)
    → Component resolution (registry lookup → fallback if missing)
    → Props resolution (defaults merge + node props)
    → Style resolution (base + responsive merge per breakpoint)
    → Interaction binding
    → Render call (editorRenderer | runtimeRenderer)
      → Output DOM
```

### Performance Optimization

- Memoize component renders by node id + props hash
- Batch style recalculation on breakpoint switch
- Lazy-evaluate children of collapsed containers
- Incremental re-render: changed subtrees only
- Runtime bundle must be tree-shakeable
- Editor code must not leak into runtime bundle

---

## Dynamic Component Loading

### Component Manifest Contract

```ts
interface ComponentManifest {
  serviceId: string;
  name: string;
  version: string;
  components: ComponentManifestEntry[];
}

interface ComponentManifestEntry {
  type: string;
  name: string;
  category: string;
  version: string;
  bundleUrl: string; // ES module URL
  integrityHash?: string; // SRI hash
  dependencies?: string[]; // required component types
  minCoreVersion?: string; // semver requirement
  icon?: string;
  description?: string;
  tags?: string[];
}
```

### Loading Process

1. Fetch manifest from service URL
2. Validate manifest schema + version compatibility
3. Resolve dependency order
4. Fetch component bundle (with integrity check if hash)
5. Execute bundle in isolated scope
6. Extract `ComponentDefinition` export
7. Validate definition schema
8. Register via `builder.registerComponent()`
9. Emit `component:loaded` event
10. Update component palette

### Network Contract

- Manifest fetch timeout: 10s (configurable)
- Bundle fetch timeout: 30s (configurable)
- Retry: 3 times with exponential backoff
- Failed component → render `RemoteComponentErrorPlaceholder`
- Loaded bundles cached in session

### Security & Sandbox

- Component bundles run in sandboxed scope
- No direct access to `window`, `document`, `localStorage`
- Sandbox exposes: render context, limited DOM API for component, `ComponentContext`
- Integrity hash validation required in production
- Version conflict surfaces as warning, not silent override

---

## Asset Management System

### Asset Types & Structure

```ts
type AssetType = "image" | "video" | "font" | "icon" | "file";

interface Asset {
  id: string;
  type: AssetType;
  name: string;
  url: string;
  thumbnailUrl?: string;
  size?: number; // bytes
  dimensions?: { width: number; height: number };
  mimeType?: string;
  uploadedAt?: string;
  tags?: string[];
  source: "local" | "url" | string; // string = provider id
}

interface AssetManifest {
  version: string;
  assets: Asset[];
}
```

### Asset Provider Interface

Plugins/services can provide asset sources:

```ts
interface AssetProvider {
  id: string;
  name: string;
  icon?: string;
  supportedTypes: AssetType[];

  listAssets(query: AssetQuery): Promise<AssetListResult>;
  upload?(file: File): Promise<Asset>;
  delete?(assetId: string): Promise<void>;
}

interface AssetQuery {
  type?: AssetType;
  search?: string;
  page?: number;
  pageSize?: number;
  tags?: string[];
}
```

### Asset Picker

Opened from image/video property controls in right panel:

- Display assets from all registered providers
- Support new uploads
- Accept direct URL input
- Preview before selection
- Search and filter by type/tag

---

## Import / Export System

### Export Formats

```ts
type ExportFormat = "json" | "html" | "react" | "zip";

interface ExportConfig {
  format: ExportFormat;
  includeAssets?: boolean;
  minify?: boolean;
  prettyPrint?: boolean;
  targetNodeId?: string; // export subtree vs whole doc
}

interface ExportResult {
  content: string | Blob;
  filename: string;
  mimeType: string;
}
```

| Format  | Description                              |
| ------- | ---------------------------------------- |
| `json`  | Raw document schema (BuilderDocument)    |
| `html`  | Static HTML with inline CSS              |
| `react` | React component code (future)            |
| `zip`   | HTML + assets bundle                     |

### Import Formats

```ts
interface ImportConfig {
  format: "json"; // v1 supports JSON only
  mergeStrategy: "replace" | "merge" | "append";
}

interface ImportResult {
  document: BuilderDocument;
  warnings: string[];
  migratedFrom?: string; // pre-migration schema version
}
```

Import must:

- Validate schema before applying
- Run migrations if needed
- Surface warnings for data loss
- Support drag & drop file import

---

## Layout Models

| Layout       | Description                                    |
| ------------ | ---------------------------------------------- |
| `flow`       | Block flow, children stack by document order   |
| `flex`       | Flexbox — direction, wrap, align configurable  |
| `grid`       | CSS grid — column/row templates configurable   |
| `absolute`   | Free-form positioning via x/y coords           |
| `slot-based` | Named slots; children assign to specific slot  |

---

## Placeholder Components

Render in place of actual components when rendering fails:

| Component                    | When Rendered                               |
| ---------------------------- | ------------------------------------------- |
| `UnknownComponentPlaceholder` | Component type not in registry              |
| `RemoteComponentErrorPlaceholder` | Remote component load failed            |
| `ErrorPlaceholder`           | Component render threw error                |
| `EmptyContainerPlaceholder`  | Container without children (editor only)    |
| `LoadingPlaceholder`         | Component loading (remote)                  |

---

_For component definition schema, see `DATA_MODEL.md`._
_For asset picker UI, see `EDITOR_UI.md`._
_For plugin-based asset providers, see `PLUGINS.md`._
