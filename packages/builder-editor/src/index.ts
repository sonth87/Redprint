/**
 * @ui-builder/builder-editor — public API
 *
 * Visual editor for the UI Builder Library.
 *
 * @example
 * import { BuilderEditor } from '@ui-builder/builder-editor';
 * <BuilderEditor config={{ document: { name: 'My Page' } }} />
 */

// Main editor component
export { BuilderEditor } from "./BuilderEditor";
export type { BuilderEditorProps } from "./BuilderEditor";

// Canvas
export { CanvasRoot } from "./canvas/CanvasRoot";
export type { CanvasRootProps } from "./canvas/CanvasRoot";

// Overlays
export { SelectionOverlay, SnapGuides, HoverOutline } from "./overlay/EditorOverlay";
export type { SelectionOverlayProps, SnapGuidesProps, HoverOutlineProps } from "./overlay/EditorOverlay";

// Panels
export { ComponentPalette } from "./panels/left/ComponentPalette";
export type { ComponentPaletteProps } from "./panels/left/ComponentPalette";
export { LayerTree } from "./panels/bottom/LayerTree";
export type { LayerTreeProps } from "./panels/bottom/LayerTree";
export { PropertyPanel } from "./panels/right/PropertyPanel";
export type { PropertyPanelProps } from "./panels/right/PropertyPanel";

// Toolbar
export { EditorToolbar } from "./toolbar/EditorToolbar";
export type { EditorToolbarProps } from "./toolbar/EditorToolbar";

// Snap + shortcuts
export { SnapEngine } from "./snap/SnapEngine";
export type { SnapEngineConfig, SnapResult } from "./snap/SnapEngine";
export { ShortcutManager } from "./shortcuts/ShortcutManager";
export type { ShortcutDefinition } from "./types";

// Editor types
export type {
  ViewportState,
  NodeRect,
  SnapGuide,
  SelectionState,
  DropIndicatorState,
  DropIndicatorType,
  ResizeState,
  ResizeHandleType,
} from "./types";
