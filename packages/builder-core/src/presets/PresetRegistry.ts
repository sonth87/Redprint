/**
 * PresetRegistry — manages component presets.
 *
 * Presets are pre-configured component variations that end users can
 * browse and drag onto the canvas. They are grouped by category.
 */
import type { ComponentPreset } from "./types";

export class PresetRegistry {
  private presets = new Map<string, ComponentPreset>();

  /** Register a preset. Overwrites if id already exists. */
  register(preset: ComponentPreset): void {
    this.presets.set(preset.id, preset);
  }

  /** Register multiple presets at once. */
  registerMany(presets: ComponentPreset[]): void {
    for (const p of presets) {
      this.presets.set(p.id, p);
    }
  }

  /** Unregister a preset by id. */
  unregister(id: string): boolean {
    return this.presets.delete(id);
  }

  /** Get a single preset by id. */
  get(id: string): ComponentPreset | undefined {
    return this.presets.get(id);
  }

  /** List all presets, optionally filtered. */
  list(filter?: { componentType?: string; category?: string; search?: string }): ComponentPreset[] {
    let results = Array.from(this.presets.values());

    if (filter?.componentType) {
      results = results.filter((p) => p.componentType === filter.componentType);
    }
    if (filter?.category) {
      results = results.filter((p) => p.category === filter.category);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return results;
  }

  /** Get all unique categories. */
  getCategories(): string[] {
    const cats = new Set<string>();
    for (const p of this.presets.values()) {
      cats.add(p.category);
    }
    return Array.from(cats);
  }

  /** Get presets grouped by category. */
  getGrouped(): Map<string, ComponentPreset[]> {
    const grouped = new Map<string, ComponentPreset[]>();
    for (const p of this.presets.values()) {
      if (!grouped.has(p.category)) grouped.set(p.category, []);
      grouped.get(p.category)!.push(p);
    }
    return grouped;
  }

  /** Clear all presets. */
  clear(): void {
    this.presets.clear();
  }

  /** Get count. */
  get size(): number {
    return this.presets.size;
  }
}
