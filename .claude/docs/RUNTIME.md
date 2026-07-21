# Runtime & Content Loading

> Audience: AI agents & maintainers. User-facing overview: [/docs/user-guide/11-runtime-va-tich-hop.md](../../docs/user-guide/11-runtime-va-tich-hop.md)

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
- Render active document popups through the popup runtime layer
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

### Popup Runtime Layer

`RuntimeRenderer` renders the page root and then a document-level popup layer.
Popup content roots are normal builder nodes, but they are detached from page flow
and are rendered only when the popup is open.

Runtime responsibilities:

- Maintain a local **popup lifecycle stack** (see below)
- Execute `showModal` / `hideModal` interaction actions
- Register auto triggers: page-load delay, scroll depth, and section visible
- Apply popup frequency rules using runtime storage
- Render backdrop, shell placement, enter/exit animation, close button, Escape close,
  backdrop click close, body scroll lock, focus trap, and focus restore

Runtime popup shell dimensions are resolved from `kindConfig`: modal
`width`/`height` plus anchored `offsetX`/`offsetY`, drawer `width`, bottom sheet
`initialHeight`, and bar `height`. These values are produced by the editor popup
shell resize/drag controls and are honored by preview/runtime rendering.

Opening/closing a popup at runtime does not mutate `BuilderDocument`.

### Popup Lifecycle State Machine (V3)

Each open popup is tracked as a `PopupStackEntry` with a lifecycle state:
`opening → open → closing → closed`. The **pure transition logic lives in
`builder-core`** (`src/popups/lifecycle.ts`) so the renderer and the editor
preview share identical behavior; the renderer only owns timers + DOM.

- **Opening** plays the enter animation, then transitions to **open** after
  `animation.durationMs`.
- **Closing** plays the exit animation (`animation.exit`, falling back to
  `animation.enter`); the surface stays mounted until the duration elapses, then
  the entry is removed (**closed**). This fixes the V2 bug where exit animations
  never ran because the surface unmounted immediately.
- Re-opening a popup that is `closing` **cancels** the close and returns it to
  `opening`. Closing during `opening` transitions to `closing`.
- A popup deleted or disabled while mounted is force-removed from the stack.

### Stacking & Z-Index (V3)

`PopupDefinition.runtimeState` (optional) controls stacking:

- `stackMode`: `"single"` (default — opening one closes others),
  `"multiple"` (stack on top), or `"replace-same-kind"` (close only same-`kind`
  popups). The latest opened popup is topmost.
- `zIndexBase` (default `10000`): each stack depth gets `base + depth * 10`.
- **ESC** closes only the topmost interactive popup; **focus trap** applies only
  to the topmost. **Body scroll** stays locked while any mounted popup requests
  `lockBodyScroll`.

### Runtime Drag/Resize (V3, modal)

Opt-in, runtime-only, never mutates the document:

- `kindConfig.runtimeDraggable` adds a drag handle bar (top of the modal); the
  offset composes with the document `offsetX/offsetY` transform. `dragBounds:
  "viewport"` (default) clamps the surface on-screen.
- `kindConfig.runtimeResizable` adds a bottom-right resize handle (runtime width/
  height held in component state).
- Gestures use pointer events (touch + mouse). Editor shell drag/resize remains
  document-mutating via `UPDATE_POPUP`.
- *BottomSheet runtime snap-drag* (`runtimeDraggable`, `closeBelowSnapPoint`):
  schema is in place; the gesture is a planned follow-up.

### Accessibility & Reduced Motion (V3)

- Modal-like popups keep `role="dialog"` + `aria-modal`. When the topmost
  modal-like popup has `behavior.inertBackground`, the page root wrapper is set
  `inert` + `aria-hidden` so AT/keyboard stay inside the dialog.
- Non-backdrop popups (bar) no longer block page pointer events; only the
  surface captures them.
- `behavior.reducedMotion` (`"respect"` default) honors
  `prefers-reduced-motion: reduce` by skipping animation and transitioning
  lifecycle states immediately.

### A/B Variant Assignment & Analytics (V4)

**Variant assignment** happens at open time, runtime-only, and never mutates the
document. The renderer calls `resolveVariantAssignment` (pure, from
`builder-core`):

- `experiment.winnerVariantId` forces that variant (concluded experiment).
- `assignment: "sticky"` reuses a stored assignment; a stale one (variant deleted
  or disabled) is dropped and re-picked. Sticky reads/writes go through
  `RendererConfig.getVariantAssignment`/`setVariantAssignment` first, then fall
  back to `popupStorage` key `ui-builder:popup:{docId}:{popupId}:variant`.
- `assignment: "random"` makes a fresh weighted pick (`pickVariant`); an
  `experiment.seed` yields deterministic assignment via `seededRng`.
- When no variant is eligible (none enabled, or experiment off), the **base**
  content renders. The chosen variant's `popupPatch` is applied and its
  `rootNodeId` (or the base root) is rendered via `resolvePopupForVariant`.

**Analytics** is vendor-neutral. The renderer emits `PopupAnalyticsEvent`s through
`RendererConfig.onPopupAnalyticsEvent` **and**, if supplied, `RendererConfig.eventBus`
(`popup:analytics`). A throwing host handler is caught and never breaks the UI.
Emission points:

- `popup_variant_assigned` — on assignment (when a variant is chosen).
- `popup_open` — at opening start (carries `triggerType`, `variantId`).
- `popup_impression` — once per open lifecycle, on reaching `open`.
- `popup_close` — on close, with `closeReason`
  (`button|escape|backdrop|action|routeChange|programmatic`).
- `popup_dismiss` — on user-initiated close (escape/backdrop/button).
- `popup_cta_click` / `popup_submit` + `popup_conversion` — when a `click`/`submit`
  goal's `targetNodeId` is hit (delegated listener on the surface; each goal fires
  once per open lifecycle). A `close`-type goal converts on close.

When `RendererConfig.isPreview` is true, every event is tagged
`metadata.preview = true` so hosts can drop preview traffic.

### V6 Campaign Gate & Conflict Arbitration

V6 adds a **campaign gate** and **conflict arbitration** step that runs **before** all
V5 eligibility checks. Pure helpers live in `builder-core/src/popups/campaigns.ts`.

**Campaign gate** (`evaluateCampaignGate`):
- Popup with no `campaignId` → passes (ungrouped popups are never gated).
- Popup with unknown `campaignId` → passes (orphaned popups are lenient).
- Popup in `published` campaign → passes; `campaignId` propagated downstream.
- Popup in `draft`, `review`, `paused`, or `archived` campaign → blocked;
  emits `popup_rules_blocked` with `rulesBlockReason: "campaign"`.

**Conflict arbitration** (`arbitrate`): runs after the gate, but only for popups that
belong to a campaign. Compares the incoming popup against currently-mounted campaign
popups using `effectivePriority = (campaign.priority ?? 0) * 1000 + (popup.priority ?? 0)`.

| Policy | Decision |
|--------|----------|
| `stack` (default) | Always `open` |
| `suppress` | `open` if candidate priority ≥ max open; else `suppress` (emits `conflict` block reason) |
| `replace` | Closes all lower-priority open campaign popups (`replace`), then opens |
| `queue` | Defers to `popupQueue` if any campaign popup is mounted; drained when slot frees |

**Queue draining:** a `useEffect` on `popupStack` changes selects the highest-priority
eligible queued popup and calls `openPopup` when no campaign popups are mounted.

**Full pre-open order (V6):**
1. **Campaign gate** (`evaluateCampaignGate`) — V6 only
2. **Conflict arbitration** (`arbitrate`) — V6 only, for campaign-grouped popups
3. **Schedule** (`evaluateSchedule`) — V5
4. **Targeting** (`evaluateTargeting`) — V5
5. **Frequency** (`evaluateFrequency`) — V5
6. **Variant assignment** — V4
7. **Locale resolution** — V5

### V5 Pre-open Eligibility & Localization

Before a popup opens, the runtime runs three pure eligibility checks in order
(from `builder-core/src/popups/rules.ts`). If any fails, the popup does not open
and a `popup_rules_blocked` analytics event is emitted with `rulesBlockReason`:

1. **Schedule** — `evaluateSchedule(popup.rules.scheduling, Date.now())`. Checks
   `startDate`/`endDate` in the configured IANA timezone (via `Intl.DateTimeFormat`),
   then `timeWindow` (hours + days of week). Absent or `enabled: false` = pass.
2. **Targeting** — `evaluateTargeting(popup.rules.targeting, popupContext)`. Evaluates
   composable condition groups (AND across groups; configurable match within each group).
   Context variables are read from `RendererConfig.popupContext` via dot-notation.
   Absent or `enabled: false` = pass.
3. **Frequency** — `evaluateFrequency(popup.rules.frequency, legacyRules, getCount, …)`.
   Checks frequency cap (`maxShows` per `FrequencyUnit`) and `suppressAfterGoalIds`.
   Falls back to legacy `showOncePerSession`/`showOnceEveryDays`/`maxShows` fields.
   Absent cap = pass. After a popup opens, `recordFrequencyImpression` returns the
   storage key + new count for the runtime to persist.

**Frequency storage.** `per: "session"` uses `sessionStorage`; all other units use
`localStorage` with a `storedAt` epoch for window-expiry. Host can override both
read and write via `RendererConfig.getFrequencyCount`/`setFrequencyCount`.

**Locale resolution.** After eligibility passes, `resolveLocaleContent(popup, locale)`
selects the content root and patch. Priority: `RendererConfig.locale` → 
`navigator.language` → `popup.fallbackLocale` → base content. Match order:
exact locale tag → language-prefix match ("fr" matches "fr-CA") → fallback → base.
Locale-specific `popupPatch` is applied on top of the variant-resolved popup config.
Locale `rootNodeId` takes precedence over the base root when a content tree is
present. A `popup_locale_resolved` analytics event carries the resolved locale tag.

**New `RendererConfig` fields (V5):**

| Field | Type | Default | Purpose |
|---|---|---|---|
| `popupContext` | `Record<string, unknown>` | `{}` | Variables for targeting evaluation |
| `locale` | `string` | `navigator.language` | BCP-47 tag for locale resolution |
| `getFrequencyCount` | `(key) => { count, storedAt } \| undefined` | localStorage | Override frequency storage read |
| `setFrequencyCount` | `(key, count, expiresAt?) => void` | localStorage | Override frequency storage write |

### Interactions

**Contract:** `packages/builder-core/src/document/interactions.ts` — `InteractionConfig { id, trigger,
conditions?, actions, stopPropagation?, preventDefault?, once? }`. `once` applies only to
`trigger: "intersect"` (fire the first viewport-entry only, mirrors `_animationPlayOnce`).

**Binder:** `packages/builder-renderer/src/pipeline/InteractionBinder.ts` — a framework-light class
(no React, no real DOM access except where explicitly SSR-guarded). `bindAll(interactions, variables,
dispatch)` groups interactions by their target React event prop (`TRIGGER_TO_REACT_EVENT`) and runs
**every** interaction bound to that prop, in declaration order, when the event fires — multiple
interactions sharing a trigger do not silently overwrite each other.
`runInteraction(interaction, variables, dispatch)` is the shared condition-eval + action-dispatch
primitive, reused by both `bindAll` (DOM events) and `RuntimeNode`'s lifecycle handling below (mount/
unmount/intersect are not DOM events, so `TRIGGER_TO_REACT_EVENT` has no entry for them).

| Trigger | Binding |
|---------|---------|
| `click`, `dblclick`, `hover`/`mouseenter`, `mouseleave`, `focus`, `blur`, `submit`, `change`, `keydown`, `keyup`, `scroll` | React event prop via `bindAll` |
| `mount`, `unmount` | `useEffect` in `RuntimeNode` — fires once per node instance; cleanup runs unmount interactions. Does not run during SSR. |
| `intersect` | Dedicated `IntersectionObserver` in `RuntimeNode`, sharing the same `elementRef` callback ref used by the `_animation` display-animation observer (two independent observers on one element is safe) |

**Actions** (`InteractionAction` union) and where each is handled:

| Action | Handled in | Notes |
|--------|-----------|-------|
| `navigate` | `InteractionBinder` directly | `_self` → `window.location.assign`; `_blank` → `window.open(url, "_blank", "noopener,noreferrer")` |
| `scrollTo` | `InteractionBinder` directly | `document.getElementById(targetId)` first (real DOM id — Section/Anchor `anchorId`), falls back to `[data-node-id="…"]` (only populated when `RendererConfig.attachNodeIds` is on); SSR-guarded, no-ops with a console warning if nothing matches |
| `triggerApi` | `InteractionBinder` directly | Fire-and-forget `fetch`, `credentials: "omit"`, no retry. Gated by `isSafeFetchEndpoint()` (`packages/shared/src/urlGuard.ts`) — allows `https://` to a public host or `http://localhost`/`127.0.0.1`; rejects everything else (private/loopback/link-local IPs, `javascript:`, `data:`, plain `http://` to a real host) |
| `setState` | dispatched `SET_VARIABLE` → `RuntimeRenderer`'s `variables` state | |
| `toggleVisibility` | dispatched `TOGGLE_VISIBILITY` → `RuntimeRenderer`'s `hiddenNodeIds: Set<string>` | Runtime-only — never mutates the document, resets on reload. `RuntimeNode` early-exits (`return null`) when its id is in the set. |
| `addClass` / `removeClass` | dispatched `ADD_CLASS`/`REMOVE_CLASS` → `RuntimeRenderer`'s `nodeClassOverrides: Map<string, Set<string>>` | Merged onto the rendered element's `className` at `cloneElement` time. Only applies when the component's root element is a plain DOM tag (`typeof rendered.type === "string"`) — a Fragment or nested-component root is skipped with a one-time-per-node console warning, since it can't safely receive a `className` prop. |
| `showModal` / `hideModal` | dispatched `SHOW_MODAL`/`HIDE_MODAL` → `RuntimeRenderer`'s `openPopup`/`closePopup` | See [POPUPS.md](./POPUPS.md) |
| `emit` | dispatched `EMIT_EVENT` → `RendererConfig.onCustomEvent(event, payload)` | No listener attached → console warning, not a throw. Standard bridge for page content to notify a host app (CMS/website) of a named event. |
| `custom` | dispatched `CUSTOM_ACTION` → `RendererConfig.customActionHandlers[handler](params)` | Same no-listener-is-a-warning behavior as `emit` |

All of the above is SSR-safe: every DOM/`window`/`fetch` access in `InteractionBinder` is guarded by a
`typeof document/fetch === "undefined"` check, and the lifecycle hooks (`useEffect`,
`IntersectionObserver`) never execute during server-side rendering by construction.

### Form Submit Pipeline (roadmap 03/04)

`Form`'s own `onSubmit` is a separate pipeline from the interaction system above, not another
`InteractionAction` — it runs `packages/builder-components/src/utils/formSubmitPipeline.ts`:
`preventDefault` → `form.reportValidity()` (native HTML5 validation) → `new FormData(form)` → honeypot
check (`_hp` field) → collect `{name: value}` → dispatch per `node.props.submitAction`:

| `submitAction` | Behavior |
|----------------|----------|
| `"webhook"` | `fetch(webhookUrl, { method, credentials: "omit", body: JSON.stringify({ fields, meta }) })`. Gated by the same `isSafeFetchEndpoint()` guard as `triggerApi` above. |
| `"emit"` | Calls `RendererConfig.onFormSubmit?.(formName, fields)` — the host-app escape hatch, same shape as `onCustomEvent`. |
| `"none"` | No network call; only the node's own `submit`-trigger interactions (if any) run. |

State machine `idle → submitting → success | error` drives the success/error message shown inside the
`Form` component. A `useRef` re-entrancy guard in `FormShell` blocks a second submit while one is already
`submitting` (prevents duplicate webhook POSTs from a double Enter-key/click).

Ordering with the interaction system: `RuntimeRenderer`'s `cloneElement` step composes (does not overwrite)
same-named event handler props, so `Form`'s own `onSubmit` (the pipeline above) always runs before a
node's `submit`-trigger interaction handler, if one is also configured on the same `Form` node.

If the `Form` is inside a popup and its goal is `{ type: "submit", targetNodeId: <form's node id> }`, the
popup's `popup_submit`/`popup_conversion` analytics fire automatically (existing goal-tracking mechanism,
see [POPUPS.md](./POPUPS.md)) — no Form-specific code needed for that part. Separately,
`PopupRules.hideAfterSubmit: true` closes the popup (`onClose("submit")`, deferred one microtask so the
success message renders first).

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
