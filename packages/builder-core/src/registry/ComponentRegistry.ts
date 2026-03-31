import type { ComponentDefinition, ComponentFilter } from "./types";

/**
 * Registry for all registered ComponentDefinitions.
 * Framework-agnostic — no React dependency.
 *
 * Used by both editor (component palette) and renderer (component resolution).
 *
 * @example
 * const registry = new ComponentRegistry();
 * registry.registerComponent({ type: 'text-block', ... });
 * const def = registry.getComponent('text-block');
 */
export class ComponentRegistry {
  private readonly components = new Map<string, ComponentDefinition>();

  /**
   * Register a component definition.
   * If a component with the same type is already registered, it is replaced
   * and a warning is logged in development mode.
   *
   * @param definition - The ComponentDefinition to register
   */
  registerComponent(definition: ComponentDefinition): void {
    if (this.components.has(definition.type)) {
      console.warn(
        `[ComponentRegistry] Overwriting existing component type: "${definition.type}"`,
      );
    }
    this.components.set(definition.type, definition);
  }

  /**
   * Remove a component definition by type key.
   *
   * @param type - The component type to unregister
   * @returns true if found and removed, false if not found
   */
  unregisterComponent(type: string): boolean {
    return this.components.delete(type);
  }

  /**
   * Retrieve a component definition by type key.
   *
   * @param type - The component type key
   * @returns The ComponentDefinition, or undefined if not registered
   */
  getComponent(type: string): ComponentDefinition | undefined {
    return this.components.get(type);
  }

  /**
   * List all registered components with optional filtering.
   *
   * @param filter - Optional filter criteria
   * @returns Array of matching ComponentDefinition objects
   */
  listComponents(filter?: ComponentFilter): ComponentDefinition[] {
    const all = Array.from(this.components.values());
    if (!filter) return all;

    return all.filter((def) => {
      if (filter.category && def.category !== filter.category) return false;
      if (filter.tags?.length) {
        if (!filter.tags.some((tag) => def.tags?.includes(tag))) return false;
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const matches =
          def.name.toLowerCase().includes(q) ||
          def.type.toLowerCase().includes(q) ||
          def.description?.toLowerCase().includes(q) ||
          def.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }

  /**
   * Returns the total number of registered component types.
   */
  get size(): number {
    return this.components.size;
  }

  /**
   * Returns all registered categories (deduplicated).
   */
  getCategories(): string[] {
    return [...new Set(Array.from(this.components.values()).map((d) => d.category))];
  }

  /**
   * Checks whether a type key is registered.
   *
   * @param type - Component type key to check
   */
  has(type: string): boolean {
    return this.components.has(type);
  }
}
