import type { ComponentDefinition } from "@ui-builder/builder-core";

/**
 * Creates a new ComponentDefinition by merging base with overrides.
 * `type` is required in overrides (it must be unique).
 * If propSchema or capabilities are provided in overrides, they fully replace the base.
 * All other fields are shallowly merged (overrides win on conflict).
 */
export function extendComponent(
  base: ComponentDefinition,
  overrides: Partial<ComponentDefinition> & { type: string }
): ComponentDefinition {
  return { ...base, ...overrides };
}
