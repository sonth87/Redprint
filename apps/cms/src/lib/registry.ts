import { ComponentRegistry } from "@ui-builder/builder-core";
import { BASE_COMPONENTS } from "@ui-builder/builder-components";

// Module-level singleton — created once at import time, shared across the entire app.
export const registry = new ComponentRegistry();

for (const component of BASE_COMPONENTS) {
  registry.registerComponent(component);
}
