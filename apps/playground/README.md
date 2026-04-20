# Playground — UI Builder Interactive Sandbox

A multi-view development environment for the UI Builder library. Features a dual-mode editor (visual + code), production preview, and JSON inspector. Designed for testing, prototyping, and showcasing the builder's capabilities.

## Overview

The Playground provides **three distinct views**:

1. **Editor** — Full `BuilderEditor` with canvas, panels, drag-drop, and component palette
2. **Preview** — Production-grade `RuntimeRenderer` rendering the designed layout
3. **JSON** — Raw document inspection and export for debugging

### Quick Start

```bash
cd apps/playground
npm run dev          # Start dev server (Vite, http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview built output
```

## Architecture

### File Structure

```
src/
├── App.tsx                      # Main app — tab switching, locale management, header
├── hooks/
│   └── useBuilderSetup.ts       # Initializes BuilderAPI + GroupRegistry + permissions
├── fixtures/
│   └── fixture-document.ts      # Pre-built sample page for development
├── components/
│   └── sample-components.tsx    # Custom component definitions (beyond BASE_COMPONENTS)
├── lib/
│   └── remote-palette.ts        # Remote/local fallback for palette catalog
├── i18n/
│   ├── ko.json                  # Korean (nested i18n structure)
│   └── ko-flat.json             # Korean (flat i18n structure)
└── main.tsx                     # Vite entry point
```

### Data Flow

```
useBuilderSetup()
  ├── createBuilder(FIXTURE_DOCUMENT)
  ├── register BASE_COMPONENTS
  ├── register CUSTOM_COMPONENTS
  └── create GroupRegistry

App (manages activeTab, locale)
  ├── Editor Tab
  │   └── BuilderEditor (full visual editor)
  ├── Preview Tab
  │   └── RuntimeRenderer (artboard frame)
  └── JSON Tab
      └── Document JSON inspector
```

## Key Components & Hooks

### `useBuilderSetup()`

Initializes the builder with all required state.

**Returns:**
```typescript
{
  builder: BuilderAPI;
  groupRegistry: GroupRegistry;
  useRemotePalette: boolean;
}
```

**What it does:**
- Creates a `BuilderAPI` instance with `FIXTURE_DOCUMENT` as initial state
- Registers `BASE_COMPONENTS` (built-in: Button, Card, Section, etc.)
- Registers `CUSTOM_COMPONENTS` (project-specific examples)
- Creates a `GroupRegistry` with built-in component groups & sub-groups
- Sets up permissions (canEdit, canDelete, canAddComponents, etc.)
- Cleans up builder on unmount

**Usage:**
```typescript
const { builder, groupRegistry, useRemotePalette } = useBuilderSetup();
```

### Fixture Document

**File:** `src/fixtures/fixture-document.ts`

A pre-built `BuilderDocument` demonstrating:
- Canvas configuration (width, height, background)
- Multi-level component hierarchy
- Responsive breakpoints (desktop, tablet, mobile)
- Realistic content & layout

Used as the default starting point for the editor.

### Remote Palette Provider

**File:** `src/lib/remote-palette.ts`

Implements `RemotePaletteProvider` interface with four methods:

```typescript
{
  fetchCatalog(): Promise<PaletteCatalog>
  fetchMetadata(): Promise<PaletteCatalog>
  fetchGroupItems(groupId: string): Promise<GroupItems>
  fetchItem(id: string): Promise<PaletteItem>
}
```

**Behavior:**
- Attempts to fetch from a live API (`http://localhost:3002/api/palette`)
- Falls back to local `palette.combined.json` on failure
- Enables offline development & graceful degradation

### Custom Components

**File:** `src/components/sample-components.tsx`

Defines project-specific components beyond the base library:
- Example: custom "HeroSection", "FeatureCard", etc.
- Exported as `CUSTOM_COMPONENTS` array
- Registered in `useBuilderSetup()`

### App Component

**Features:**
- **Tab Switching** — Editor / Preview / JSON views
- **Locale Management** — EN → VI → KO → KO-FLAT toggle
- **i18n Integration** — Passes locale & resources to BuilderEditor
- **Runtime Registry** — Combines BASE_COMPONENTS + CUSTOM_COMPONENTS for preview
- **Canvas State Preservation** — Editor tab kept in DOM to preserve zoom/pan/selection

**Header Elements:**
- Brand logo ("B") + "UI Builder" label
- Tab toggle buttons
- Locale switcher
- GitHub link

**Tab Implementation:**

Each tab is conditionally rendered:
- **Editor:** Always mounted (hidden via `display: none`), preserves internal state
- **Preview:** Rendered only when active, uses artboard frame matching editor canvas
- **JSON:** Rendered only when active, shows pretty-printed document JSON

### Artboard Frame

The Preview tab renders inside a styled `<div>` that exactly mirrors the editor canvas:

```typescript
<div style={{
  width: canvasConfig.width,
  minHeight: canvasConfig.height,
  backgroundColor: canvasConfig.backgroundColor,
  position: 'relative',
  borderRadius: 4,
  flexShrink: 0,
}}>
  <RuntimeRenderer ... />
</div>
```

Ensures `position: absolute`, widths, overflow, and spacing are **identical** between editor and preview.

### i18n System

The playground supports **4 language modes**:

1. **EN** (English) — default
2. **VI** (Tiếng Việt) — Vietnamese
3. **KO** (한국어 nested) — Korean with nested i18n structure
4. **KO-FLAT** (한국어 flat) — Korean with flat i18n structure (for testing)

**Files:**
- `src/i18n/ko.json` — nested structure
- `src/i18n/ko-flat.json` — flat structure

Toggle with the **Languages** button in the header. Persisted in component state (not localStorage).

## Workflow

### Editing a Design

1. **Start in Editor tab** — See full BuilderEditor UI
2. **Drag components** from palette onto canvas
3. **Edit properties** in the right panel
4. **Preview in real-time** — switch to Preview tab to see production render
5. **Inspect JSON** — switch to JSON tab to see the raw document structure
6. **Switch locales** — test UI in different languages

### Testing Custom Components

1. **Define in** `src/components/sample-components.tsx`
2. **Register in** `useBuilderSetup()` via `CUSTOM_COMPONENTS`
3. **Access in Editor** — available in the component palette
4. **Test in Preview** — rendered by RuntimeRenderer

### Testing Remote Palette

1. **Start API server** at `http://localhost:3002`
2. **Playground auto-fetches** from `/api/palette/...` endpoints
3. **Fallback works offline** — uses `palette.combined.json` if API unavailable

## Configuration

### Environment

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS v4
- **Icons:** lucide-react

### Dependencies

**From monorepo:**
- `@ui-builder/builder-core` — BuilderAPI, BuilderDocument, GroupRegistry
- `@ui-builder/builder-components` — BASE_COMPONENTS
- `@ui-builder/builder-react` — React hooks & context
- `@ui-builder/builder-editor` — Full visual editor
- `@ui-builder/builder-renderer` — Production renderer
- `@ui-builder/ui` — shadcn design system
- `@ui-builder/shared` — Shared constants (e.g., GRID_UNIT_PX)

**External:**
- React, React-DOM
- Tailwind CSS + PostCSS
- lucide-react (icons)
- i18next (for locale switching in BuilderEditor)

### Scripts

```bash
npm run dev       # Dev server (hot reload)
npm run build     # TypeScript + Vite build
npm run preview   # Serve built output locally
```

## Integration Points

### BuilderEditor Props

```typescript
<BuilderEditor
  builder={builder}                                  # BuilderAPI instance
  groupRegistry={groupRegistry}                     # Component groups
  remotePaletteProvider={remotePaletteProvider}     # Optional: fetch remote items
  locale={locale}                                   # Current language
  i18nResources={i18nResources}                     # i18n translations
  className="h-full"
  warnOnLeave={true}                               # Prompt on unsaved changes
/>
```

### RuntimeRenderer Props

```typescript
<RuntimeRenderer
  document={document}                               # BuilderDocument to render
  registry={runtimeRegistry}                       # Components to use
  config={{
    breakpoint: "desktop",                         # Current viewport
    variables: {},                                 # CSS variables
    attachNodeIds: false,                          # Data attributes for nodes
  }}
/>
```

## Permissions Model

The builder initializes with full permissions:

```typescript
permissions: {
  canEdit: true,                # Edit existing nodes
  canDelete: true,              # Delete nodes
  canAddComponents: true,       # Drag new components onto canvas
  canLoadRemoteComponents: true,# Fetch remote palette items
  canExport: true,              # Export document
  canImport: true,              # Import document
}
```

Restrict as needed for different user roles (e.g., viewer, editor, admin).

## Advanced Features

### Canvas Configuration

The fixture document includes canvas settings:
```typescript
canvasConfig: {
  width: 1280,                    // Fixed or responsive width
  height: 800,                    // Minimum height
  backgroundColor: "#ffffff",     // Canvas background
}
```

Responsive breakpoints can be defined:
```typescript
breakpoints: [
  { breakpoint: "desktop", minWidth: 1280 },
  { breakpoint: "tablet", minWidth: 768, maxWidth: 1279 },
  { breakpoint: "mobile", minWidth: 0, maxWidth: 767 },
]
```

### Document Persistence

The playground does NOT auto-save. To persist changes:
1. **Export** — Copy JSON from JSON tab, save to file
2. **Import** — Replace `FIXTURE_DOCUMENT` with saved JSON
3. **API Integration** — Connect to a backend for saving

### Responsive Preview

The RuntimeRenderer accepts a `breakpoint` config:
```typescript
config={{ breakpoint: "desktop" | "tablet" | "mobile" }}
```

Allows testing responsive layouts by switching breakpoints in the Preview tab.

## Troubleshooting

### API Connection Failed

If you see *"API unavailable, falling back to local JSON"*, the palette API is down:
- Verify API server is running at `http://localhost:3002`
- Check network tab in DevTools
- Playground gracefully uses `palette.combined.json` as fallback

### Components Not Showing in Palette

- Ensure components are registered in `useBuilderSetup()`
- Check that `BASE_COMPONENTS` and `CUSTOM_COMPONENTS` are imported
- Verify GroupRegistry is properly initialized with groups

### Preview Doesn't Match Editor

- Check that both use the **same RuntimeRegistry** (BASE_COMPONENTS + CUSTOM_COMPONENTS)
- Verify canvas dimensions in artboard frame match editor config
- Ensure RuntimeRenderer receives the current document state

## Future Enhancements

- [ ] Auto-save to localStorage
- [ ] Document undo/redo
- [ ] Share playground link with snapshot
- [ ] Performance profiling mode
- [ ] Accessibility audit integration
- [ ] Component testing framework integration
- [ ] Live collaboration (WebSocket sync)

---

**Last updated:** 2026-04-20
