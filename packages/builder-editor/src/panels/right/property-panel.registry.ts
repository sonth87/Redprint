import type { PropertyPanelPlugin } from "./property-panel.types";

const registry = new Map<string, PropertyPanelPlugin>();

export function registerPlugin(plugin: PropertyPanelPlugin): void {
  const types = Array.isArray(plugin.componentType)
    ? plugin.componentType
    : [plugin.componentType];
  types.forEach((t) => registry.set(t, plugin));
}

export function getPlugin(type: string): PropertyPanelPlugin | undefined {
  return registry.get(type);
}

export function listPlugins(): PropertyPanelPlugin[] {
  return Array.from(new Set(registry.values()));
}
