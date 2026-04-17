/**
 * serializePresets — compact preset catalog for AI context.
 *
 * Level-0 format: Generates a single-line-per-category index listing all presets.
 * The AI uses this compact summary to know what presets exist without seeing
 * full props/style data. When it references a preset ID, the backend can
 * resolve it on-demand via PaletteService.getItem().
 *
 * Phase 4C: Section-first format — prioritizes pre-built section templates.
 *
 * Format:
 *   [SECTION TEMPLATES]
 *   id(ComponentType,purpose,layoutVariant): description
 *
 *   [ELEMENT PRESETS]
 *   Group: id1(ComponentType,tag1|tag2), id2(ComponentType,tag3), ...
 *
 * Example:
 *   [SECTION TEMPLATES]
 *   section-hero-center(Section,hero,center): Full-width hero with centered headline
 *   section-features-3col(Section,features,3col-grid): Three-column feature grid
 *
 *   [ELEMENT PRESETS]
 *   Text: text-h1(Text,h1|heading), text-h2(Text,h2|heading)
 *   Button: btn-primary(Button,cta|primary), btn-outline(Button,secondary)
 */
import type { PaletteCatalog } from "@ui-builder/builder-core";

export function serializePresetsCompact(catalog: PaletteCatalog): string {
  const lines: string[] = [];

  // Phase 4C: Section templates first (prioritize for page generation)
  const sectionsGroup = catalog.groups.find((g) => g.id === "sections");
  if (sectionsGroup) {
    lines.push("[SECTION TEMPLATES]");
    for (const type of sectionsGroup.types) {
      for (const item of type.items) {
        const purpose = (item as unknown as { purpose?: string }).purpose || "";
        const layoutVariant = (item as unknown as { layoutVariant?: string }).layoutVariant || "";
        const desc = item.description ? `: ${item.description}` : "";
        lines.push(
          `${item.id}(Section,${purpose || "custom"},${layoutVariant || "standard"})${desc}`
        );
      }
    }
    lines.push("");
  }

  // Element presets
  lines.push("[ELEMENT PRESETS]");
  for (const group of catalog.groups) {
    if (group.id === "sections") continue; // skip sections, already processed
    for (const type of group.types) {
      const itemLines = type.items
        .map((item) => {
          const tags = item.tags?.length ? `${item.tags.join("|")}` : "";
          return `${item.id}(${item.componentType}${tags ? `,${tags}` : ""})`;
        })
        .join(", ");

      if (itemLines) {
        lines.push(`${type.label}: ${itemLines}`);
      }
    }
  }

  return lines.join("\n");
}
