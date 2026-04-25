# Image Filter System

**Location:** `packages/shared/src/imageFilters.ts`  
**Consumers:** `builder-components` (Image.tsx), `builder-editor` (ImageFilterPicker.tsx)  
**Version:** 1.0 | **Last updated:** 2026-04

---

## Overview

The Image component includes **39 Instagram-style filter presets** that can be applied to any image element. Filters are defined in a framework-agnostic way in `@ui-builder/shared` so they can be consumed by both the editor UI (picker component) and the runtime renderer without creating circular dependencies.

### Key Characteristics

- **Zero DOM dependencies** — filter definitions are pure TypeScript data
- **Three rendering modes** — CSS, SVG, and overlay techniques for different effect types
- **Live preview** — each filter shows a live preview swatch in the picker UI
- **Runtime-ready** — same filters apply consistently in both editor canvas and production runtime

---

## Filter Modes

Each filter uses one of three rendering techniques:

### 1. CSS Mode

Direct CSS `filter` property chain applied to `<img>`.

**Examples:** Kennedy, Darken, Lighten, Orca, Gotham, Soledad

**Advantages:**
- Native browser support
- No extra DOM elements
- Performant (GPU-accelerated)

**Example definition:**
```typescript
{
  value: "kennedy",
  label: "Kennedy",
  mode: "css",
  cssFilter: "grayscale(0.5) contrast(1.2) brightness(1.15) sepia(0.2)",
}
```

### 2. SVG Mode

SVG `<filter>` element with `<feColorMatrix>`, `<feOffset>`, `<feComponentTransfer>` etc.

**Examples:** 3D (anaglyph), Ink (high-contrast grayscale)

**Advantages:**
- Complex effects impossible with CSS alone
- Pixel-level control via color matrices
- Chainable filter primitives

**How it works:**
1. SVG filter def is defined as a string in `imageFilters.ts`
2. Hidden `<svg>` injected into DOM with all SVG defs
3. Image applies `filter: url(#svgId)` to reference the definition

**Example: Anaglyph 3D**

Splits RGB channels to create stereoscopic 3D effect:
- Red channel shifted **left** (-6px)
- Cyan (G+B) channel shifted **right** (+6px)
- Blended with `screen` mode

```typescript
{
  value: "3d",
  label: "3D",
  mode: "svg",
  svgId: "if-3d",
  svgDef: `
    <filter id="if-3d" ...>
      <feColorMatrix ... result="red" values="1 0 0 0 0  0 0 0 0 0  ..." />
      <feOffset in="red" dx="-6" dy="0" result="redShifted"/>
      <feColorMatrix ... result="cyan" values="0 0 0 0 0  0 1 0 0 0  ..." />
      <feOffset in="cyan" dx="6" dy="0" result="cyanShifted"/>
      <feBlend in="redShifted" in2="cyanShifted" mode="screen"/>
    </filter>
  `
}
```

**Example: Ink**

Ultra-high contrast grayscale with threshold-like darkening:

```typescript
{
  value: "ink",
  label: "Ink",
  mode: "svg",
  svgId: "if-ink",
  svgDef: `
    <filter id="if-ink" ...>
      <feColorMatrix type="saturate" values="0" result="gray"/>
      <feComponentTransfer in="gray">
        <feFuncR type="linear" slope="1.8" intercept="-0.35"/>
        <feFuncG type="linear" slope="1.8" intercept="-0.35"/>
        <feFuncB type="linear" slope="1.8" intercept="-0.35"/>
      </feComponentTransfer>
    </filter>
  `
}
```

### 3. Overlay Mode

CSS filter on `<img>` + color `<div>` overlay with `mix-blend-mode`.

**Examples:** Hulk (green), Marge (yellow), Lucille (red), Barney (purple), Neptune (blue), Jellybean (pink)

**Advantages:**
- Simulates Instagram duotone/color-cast effects
- Flexible blend modes (`multiply`, `soft-light`, etc.)
- Combines base filter + color layer

**How it works:**
1. Base CSS filter applied to `<img>` (e.g., `contrast(1.2) brightness(0.95)`)
2. Solid color `<div>` positioned absolutely over the image
3. `mix-blend-mode` controls how color blends (usually `multiply` for darkening or `soft-light` for subtle tint)
4. `opacity` controls blend intensity

**Example: Hulk (bright green)**

```typescript
{
  value: "gumby",
  label: "Gumby",
  mode: "overlay",
  overlayBaseCss: "saturate(1.2) brightness(1.0) contrast(1.1)",
  overlayColor: "#00a86b",           // bright green
  overlayOpacity: 0.35,
  overlayBlend: "multiply",
}
```

**Example: Marge (yellow/orange)**

```typescript
{
  value: "marge",
  label: "Marge",
  mode: "overlay",
  overlayBaseCss: "contrast(1.3) brightness(0.85) saturate(1.1)",
  overlayColor: "#ddaa00",           // golden yellow
  overlayOpacity: 0.55,
  overlayBlend: "multiply",
}
```

---

## Filter Catalog (39 Presets)

Arranged in 13 rows of 3 filters each, presented in the picker UI:

| Row | Filter 1 | Filter 2 | Filter 3 |
|-----|----------|----------|----------|
| 1 | None | Kennedy | Darken |
| 2 | Blur | Lighten | Faded |
| 3 | Kerouac | Orca | Sangria |
| 4 | Gotham | Nightrain | Whistler |
| 5 | Feathered | Soledad | Goldie |
| 6 | 3D | Ink | Manhattan |
| 7 | Gumby | Organic | Elmo |
| 8 | Neptune | Jellybean | Neon Sky |
| 9 | Hulk | Bauhaus | Yoda |
| 10 | Midnight | Unicorn | Blue Ray |
| 11 | Malibu | Red Rum | Flamingo |
| 12 | Hydra | Kool-Aid | Barney |
| 13 | Pixie | Marge | Lucille |

### Filter Details

#### CSS-based Filters

| Name | CSS Chain | Vibe |
|------|-----------|------|
| Kennedy | `grayscale(0.5) contrast(1.2) brightness(1.15) sepia(0.2)` | Warm B&W, vintage |
| Darken | `brightness(0.65) contrast(1.25)` | Dark, high-contrast |
| Blur | `blur(4px) brightness(1.05)` | Soft, dreamy |
| Lighten | `brightness(1.45) contrast(0.85) saturate(0.9)` | Bright, washed |
| Orca | `saturate(1.6) hue-rotate(165deg) brightness(1.05) contrast(1.15)` | Cool blue-green |
| Gotham | `grayscale(1) contrast(1.4) brightness(0.8)` | Dark moody B&W |
| Soledad | `sepia(0.7) contrast(1.1) brightness(0.9) saturate(1.3)` | Brown sepia warm |

#### SVG-based Filters

| Name | Technique | Effect |
|------|-----------|--------|
| 3D | Anaglyph (split channel) | Red-left + Cyan-right stereoscopic |
| Ink | High-contrast grayscale | Ink-on-paper look |

#### Overlay-based Filters

| Name | Base CSS | Color | Opacity | Blend | Vibe |
|------|----------|-------|---------|-------|------|
| Faded | `sepia(0.2) ...` | `#f5e6d0` | 0.22 | soft-light | Faded vintage |
| Kerouac | `sepia(0.35) ...` | `#c8a882` | 0.2 | multiply | Brown sepia |
| Sangria | `contrast(1.1) ...` | `#8b1a3a` | 0.28 | multiply | Deep burgundy |
| Nightrain | `contrast(1.2) ...` | `#1a1040` | 0.35 | multiply | Dark purple |
| Whistler | `brightness(1.1) ...` | `#d0e8f0` | 0.25 | soft-light | Cool blue tint |
| Feathered | `contrast(0.85) ...` | `#e8ddd0` | 0.3 | soft-light | Light warm |
| Goldie | `brightness(1.1) ...` | `#f5c842` | 0.25 | soft-light | Golden yellow |
| Manhattan | `grayscale(0.3) ...` | `#c8b090` | 0.22 | multiply | Brown sepia |
| Gumby | `saturate(1.2) ...` | `#00a86b` | 0.35 | multiply | **Bright green** |
| Organic | `sepia(0.4) ...` | `#8b6914` | 0.28 | multiply | Olive brown |
| Elmo | `contrast(1.15) ...` | `#cc2200` | 0.32 | multiply | **Red-orange** |
| Neptune | `saturate(0.9) ...` | `#6688cc` | 0.38 | multiply | **Slate blue** |
| Jellybean | `contrast(1.1) ...` | `#cc0088` | 0.38 | multiply | **Hot pink** |
| Neon Sky | `contrast(1.1) ...` | `#ff8800` | 0.3 | soft-light | **Orange glow** |
| Hulk | `contrast(1.2) ...` | `#33cc00` | 0.45 | multiply | **Bright lime green** |
| Bauhaus | `grayscale(0.3) ...` | `#c8c0a8` | 0.25 | multiply | Muted beige |
| Yoda | `contrast(1.1) ...` | `#006644` | 0.38 | multiply | **Forest green** |
| Midnight | `brightness(0.6) ...` | `#000033` | 0.5 | multiply | Very dark blue |
| Unicorn | `brightness(1.1) ...` | `#d4a8e8` | 0.4 | soft-light | **Light purple** |
| Blue Ray | `contrast(1.2) ...` | `#0022dd` | 0.45 | multiply | **Deep blue** |
| Malibu | `brightness(1.05) ...` | `#8888ee` | 0.35 | soft-light | **Soft lavender** |
| Red Rum | `contrast(1.3) ...` | `#990000` | 0.45 | multiply | **Deep red** |
| Flamingo | `brightness(1.1) ...` | `#ff88aa` | 0.38 | soft-light | **Pink coral** |
| Hydra | `brightness(1.15) ...` | `#ffaacc` | 0.3 | soft-light | **Light pink** |
| Kool-Aid | `contrast(1.2) ...` | `#aa0066` | 0.45 | multiply | **Magenta** |
| Barney | `contrast(1.2) ...` | `#550066` | 0.5 | multiply | **Purple** |
| Pixie | `brightness(1.2) ...` | `#c8e8f0` | 0.35 | soft-light | **Light cyan** |
| Marge | `contrast(1.3) ...` | `#ddaa00` | 0.55 | multiply | **Golden yellow** |
| Lucille | `contrast(1.4) ...` | `#cc1100` | 0.55 | multiply | **Bright red** |

---

## Implementation Details

### Location in Code

**`packages/shared/src/imageFilters.ts`**
- `ImageFilter` interface definition
- `IMAGE_FILTERS: ImageFilter[]` constant array
- Helper functions: `getFilterDef()`, `buildCssFilter()`, `collectSvgFilterDefs()`

**`packages/builder-components/src/components/Image.tsx`**
- Imports filter defs from shared
- `propSchema.filter` options generated from `IMAGE_FILTERS`
- Renders correct CSS / SVG defs / overlay based on filter mode
- Both `editorRenderer` and `runtimeRenderer` support filters

**`packages/builder-editor/src/panels/ImageFilterPicker.tsx`**
- React UI for selecting filters
- Shows 3×13 grid of preview swatches
- Each swatch renders live preview with applied filter
- Injects hidden SVG defs into DOM

### Helper Functions

```typescript
// Look up filter definition by value key
export function getFilterDef(value: string): ImageFilter | undefined

// Build CSS filter string for <img>
// - "css" mode → returns cssFilter string
// - "svg" mode → returns "url(#svgId)"
// - "overlay" mode → returns overlayBaseCss
// - "none" → returns undefined
export function buildCssFilter(def: ImageFilter | undefined): string | undefined

// Collect all SVG filter def markup for injection
export function collectSvgFilterDefs(): string
```

### Data Flow

#### Editor Canvas

1. User opens **ImageFilterPicker** popover or panel section
2. Picker renders 39 swatches, each showing live preview of that filter
3. User clicks a filter swatch
4. Value (e.g., `"hulk"`, `"3d"`) is stored in `node.props.filter`
5. **Image.tsx editorRenderer** re-renders:
   - Looks up filter def via `getFilterDef("hulk")`
   - Builds CSS string via `buildCssFilter(def)`
   - Renders `<SvgFilterDefs>` if mode is "svg"
   - Renders overlay `<div>` if mode is "overlay"

#### Runtime / Production

1. Document serialized with `node.props.filter = "hulk"`
2. **Image.tsx runtimeRenderer** executes same logic as editor
3. Rendered image applies filter identically

---

## Adding New Filters

### Steps

1. **Add to `IMAGE_FILTERS` array** in `packages/shared/src/imageFilters.ts`
   - Pick a unique `value` key (e.g., `"mysuperfilter"`)
   - Provide human-readable `label`
   - Choose `mode: "css" | "svg" | "overlay"`
   - Set appropriate CSS/SVG/overlay properties

2. **For SVG filters:**
   - Define SVG markup string as a constant (e.g., `const SVG_MYFILTER = ...`)
   - Set `svgDef: SVG_MYFILTER` and `svgId: "if-myfilter"`

3. **Test in picker UI:**
   ```bash
   pnpm dev
   # Open playground, click Image component, open Filter picker
   # New filter should appear in the 3×13 grid
   ```

4. **Test in canvas:**
   - Apply filter to an image in editor canvas
   - Verify preview looks correct
   - Test in runtime renderer (production build)

### Example: Adding a Sepia-Tint Overlay Filter

```typescript
// In IMAGE_FILTERS array:
{
  value: "sepiatint",
  label: "Sepia Tint",
  mode: "overlay",
  overlayBaseCss: "sepia(0.5) contrast(1.1) brightness(1.0)",
  overlayColor: "#b8860b",        // goldenrod
  overlayOpacity: 0.25,
  overlayBlend: "multiply",
}
```

---

## Performance Notes

- **CSS filters:** Fully GPU-accelerated, negligible performance cost
- **SVG filters:** Slightly more expensive than CSS (per-pixel color matrix math), but still performant for typical image sizes
- **Overlay mode:** Two-layer render (image + div), no extra perf cost vs. single layer

All filters render at 60fps on modern browsers.

---

## Browser Support

- **CSS filters:** All modern browsers (IE11 partial support)
- **SVG filters:** All modern browsers (IE11+ with some limitations)
- **mix-blend-mode:** All modern browsers (IE11 not supported, but graceful fallback)

Fallback: If a filter fails to render, image displays unfiltered (no error).

