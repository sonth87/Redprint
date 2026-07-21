import type { ComponentDefinition } from "@ui-builder/builder-core";

/**
 * Creates a new ComponentDefinition by merging base with overrides.
 * `type` is required in overrides (it must be unique).
 * If propSchema or capabilities are provided in overrides, they fully replace the base.
 * All other fields are shallowly merged (overrides win on conflict).
 *
 * `aiHints` is the one exception to "fully replace": it is merged **per field**
 * (roadmap 03/01) so a variant (e.g. a Gallery layout like Masonry/Collage) can
 * override just `sectionAffinity` or `examples` while still inheriting
 * `purpose`/`bestFor`/`contentSlots` from the base definition, instead of having
 * to repeat the whole hints object.
 */
export function extendComponent(
  base: ComponentDefinition,
  overrides: Partial<ComponentDefinition> & { type: string }
): ComponentDefinition {
  return {
    ...base,
    ...overrides,
    aiHints:
      base.aiHints || overrides.aiHints
        ? ({ ...base.aiHints, ...overrides.aiHints } as ComponentDefinition["aiHints"])
        : undefined,
  };
}
