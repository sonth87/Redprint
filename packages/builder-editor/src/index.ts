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
export { SelectionOverlay, SnapGuides, CanvasHelperLines, HoverOutline, DistanceGuides, LiveDimensionsDisplay } from "./overlay/EditorOverlay";
export type { SelectionOverlayProps, SnapGuidesProps, CanvasHelperLinesProps, HoverOutlineProps, DistanceGuidesProps, LiveDimensionsDisplayProps } from "./overlay/EditorOverlay";

// Panels
export { ComponentPalette } from "./panels/left/ComponentPalette";
export type { ComponentPaletteProps } from "./panels/left/ComponentPalette";
export { PresetPalette } from "./panels/left/PresetPalette";
export type { PresetPaletteProps } from "./panels/left/PresetPalette";
export { LeftSidebar } from "./panels/left/LeftSidebar";
export type { LeftSidebarProps, LeftPanelTab } from "./panels/left/LeftSidebar";
export { FloatingPalette } from "./panels/left/FloatingPalette";
export type { FloatingPaletteProps } from "./panels/left/FloatingPalette";
export { AddElementsPanel } from "./panels/left/AddElementsPanel";
export type { AddElementsPanelProps } from "./panels/left/AddElementsPanel";
export { PaletteItemCard } from "./panels/left/PaletteItemCard";
export type { PaletteItemCardProps } from "./panels/left/PaletteItemCard";
export { LayerTree } from "./panels/bottom/LayerTree";
export type { LayerTreeProps } from "./panels/bottom/LayerTree";
export { PropertyPanel } from "./panels/right/PropertyPanel";
export type { PropertyPanelProps } from "./panels/right/PropertyPanel";
export { PageSettings } from "./panels/right/PageSettings";
export type { PageSettingsProps } from "./panels/right/PageSettings";
export { MediaManager } from "./panels/MediaManager";
export type { MediaManagerProps } from "./panels/MediaManager";

// Toolbar
export { EditorToolbar } from "./toolbar/EditorToolbar";
export type { EditorToolbarProps } from "./toolbar/EditorToolbar";
export { ToolbarButton } from "./toolbar/ToolbarButton";
export type { ToolbarButtonProps } from "./toolbar/ToolbarButton";
export { ToolbarToggle } from "./toolbar/ToolbarToggle";
export type { ToolbarToggleProps } from "./toolbar/ToolbarToggle";
export { TextEditToolbar } from "./toolbar/TextEditToolbar";
export type { TextEditToolbarProps } from "./toolbar/TextEditToolbar";

// Inline text editor
export { InlineTextEditor } from "./canvas/InlineTextEditor";
export type { InlineTextEditorProps } from "./canvas/InlineTextEditor";

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
  DistanceGuide,
  LiveDimensions,
  SelectionState,
  DropIndicatorState,
  DropIndicatorType,
  ResizeState,
  ResizeHandleType,
} from "./types";

// Property controls (shared between toolbar and property panel)
export {
  PropertyInput,
  ColorControl,
  FontSizeControl,
  FontWeightControl,
  TextAlignControl,
  TextDecorationControl,
  OpacityControl,
  BorderRadiusControl,
  DisplayControl,
  PositionControl,
  OverflowControl,
} from "./properties/PropertyControls";

// i18n
export { initI18n, i18n, defaultResources } from "./i18n";
export type { SupportedLocale } from "./i18n";

// AI Assistant
export { AIAssistant } from "./ai/AIAssistant";
export type { AIAssistantProps } from "./ai/AIAssistant";
export { AIConfigPanel } from "./ai/AIConfig";
export type { AIConfigPanelProps } from "./ai/AIConfig";
export { sendAIMessage, getAIAdapter } from "./ai/AIService";
export { buildAIContext } from "./ai/buildAIContext";
export { AIConfigProvider, useAIConfig } from "./ai/AIConfigContext";
export type {
  AIProvider,
  AIConfig,
  AIMessage,
  AIConversation,
  AIBuilderContext,
  AICommandSuggestion,
  AIResponse,
  AIProviderAdapter,
} from "./ai/types";

// AI Tools (contextual toolbar)
export { AIToolsPopover } from "./ai/ai-tools/AIToolsPopover";
export type { AIToolsPopoverProps } from "./ai/ai-tools/AIToolsPopover";
export { executeAIToolsAction } from "./ai/ai-tools/ai-tools-service";
export {
  AI_TONES,
  AI_TEXT_ACTIONS,
  AI_IMAGE_ACTIONS,
  AI_CUSTOM_SUGGESTIONS,
  AI_REGENERATE_COOLDOWN_SECONDS,
} from "./ai/ai-tools/ai-tools-config";
export type {
  AIToolsMode,
  AITone,
  AIToolsAction,
  AICustomSuggestion,
  AIToolsRequest,
  AIToolsResponse,
  AIToolsStrategy,
  AIToolsState,
  AIToolsView,
} from "./ai/ai-tools/types";
