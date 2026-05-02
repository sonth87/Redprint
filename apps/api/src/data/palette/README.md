# Palette Data Structure

The palette data is organized into separate group files for easier management and editing.

## Files

- **index.json** - Index file listing all groups (metadata only)
- **text.json** - Text and typography components (headings, paragraphs, titles, text masks)
- **button.json** - Button component variants with hover states
- **gallery.json** - Gallery component variants (grid, slider, pro layouts)
- **menu.json** - Navigation menu variants (horizontal, hamburger, vertical)
- **image.json** - Image component presets
- **container.json** - Container/layout component presets
- **card.json** - Card component variants
- **decorative.json** - Decorative elements
- **collection.json** - Collection/grid component variants

## How to Use

### Loading the Palette

```typescript
import { loadPalette, loadPaletteSync, getGroup } from './palette/loader';

// Async (recommended)
const palette = await loadPalette();
const menuGroup = await getGroup('menu');

// Sync
const palette = loadPaletteSync();
const menuGroup = getGroupSync('menu');
```

### Editing Groups

1. Open the specific group file you want to edit (e.g., `button.json`)
2. Modify the items, types, or props as needed
3. The changes will be automatically loaded by the loader

### Adding New Items

To add a new item to a group:

1. Find the appropriate group file
2. Add the item to the `types[].items` array
3. Make sure the `id` is unique across the group

Example structure for an item:

```json
{
  "id": "unique-item-id",
  "componentType": "Button",
  "name": "Button Label",
  "description": "Optional description",
  "thumbnail": null,
  "props": {
    "label": "<p>Button Text</p>",
    "variant": "primary",
    "size": "md",
    "hoverStyle": { "backgroundColor": "#1f2937" }
  },
  "style": {
    "backgroundColor": "#111827",
    "color": "#ffffff"
  },
  "tags": ["button", "primary"]
}
```

### Directory Structure

```
src/data/
├── palette/
│   ├── loader.ts           (Loader module - reads all groups)
│   ├── index.json          (Groups index)
│   ├── text.json           (Text group)
│   ├── button.json         (Button group)
│   ├── gallery.json        (Gallery group)
│   ├── menu.json           (Menu group)
│   ├── image.json          (Image group)
│   ├── container.json      (Container group)
│   ├── card.json           (Card group)
│   ├── decorative.json     (Decorative group)
│   ├── collection.json     (Collection group)
│   └── README.md           (This file)
└── palette.combined.json   (Backup - old single file)
```

## Performance Notes

- Group files are loaded on-demand
- The loader caches the palette in memory to avoid repeated file reads
- For best performance in production, consider pre-loading the palette at startup

## Backward Compatibility

The old `palette.combined.json` file is kept as a backup. The API automatically uses the loader to combine all group files dynamically.
