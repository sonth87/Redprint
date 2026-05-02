import { ComponentRegistry } from "@ui-builder/builder-core";
import { BASE_COMPONENTS } from "@ui-builder/builder-components";

export function createRegistry(): ComponentRegistry {
  const r = new ComponentRegistry();
  for (const component of BASE_COMPONENTS) {
    r.registerComponent(component);
  }
  return r;
}
