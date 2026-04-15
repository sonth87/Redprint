// Built-in property panel plugins
// Register component-specific panel customisations here.
// Example: import { imagePlugin } from "./image.plugin";
//          registerPlugin(imagePlugin);

import { registerPlugin } from "../property-panel.registry";

// Currently no built-in plugins. Plugins can be registered externally:
//   import { registerPlugin } from "@ui-builder/builder-editor";
//   registerPlugin({ componentType: "Image", hideSections: ["typography"] });

export { registerPlugin } from "../property-panel.registry";
export { getPlugin } from "../property-panel.registry";
