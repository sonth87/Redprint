// Types
export type {
  PaletteItemChild,
  PaletteItem,
  PaletteType,
  PaletteGroup,
} from "./types/palette.types";

// Utilities
export { buildPreviewDocument } from "./lib/buildPreviewDocument";
export { createRegistry } from "./lib/registry";

// Hooks (advanced use)
export { useComponentConfigurator } from "./hooks/useComponentConfigurator";
export { useDocumentEditor } from "./hooks/useDocumentEditor";

// Components — primary API
export { PresetCatalog } from "./components/PresetCatalog";
export { PresetEditor } from "./components/PresetEditor";

// Components — secondary (custom layouts)
export { PresetInfoPanel } from "./components/PresetInfoPanel";
export { InteractiveCanvas } from "./components/InteractiveCanvas";
export { NodeTreePanel } from "./components/NodeTreePanel";
export { PropSchemaEditor } from "./components/PropSchemaEditor";
export type { PropSchemaEditorProps } from "./components/PropSchemaEditor";
export { StyleEditor } from "./components/StyleEditor";
export { StyleSections } from "./components/style-controls/StyleSections";
export { NumericInput } from "./components/style-controls/NumericInput";
export { PropControl } from "./components/prop-controls/PropControl";
