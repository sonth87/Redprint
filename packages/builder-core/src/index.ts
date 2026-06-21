/**
 * @ui-builder/builder-core — public API
 *
 * Framework-agnostic core engine for the UI Builder Library.
 * Zero React/DOM dependencies.
 *
 * @example
 * import { createBuilder, EventBus, ComponentRegistry } from '@ui-builder/builder-core';
 * const builder = createBuilder({ document: { name: 'My Page' } });
 */

// ── Factory ────────────────────────────────────────────────────────────────
export { createBuilder } from "./createBuilder";
export type { BuilderConfig, BuilderAPI, BuilderPermissions } from "./BuilderAPI";

// ── Document model ─────────────────────────────────────────────────────────
export type {
  BuilderDocument,
  BuilderNode,
  StyleConfig,
  CanvasConfig,
  NodeMetadata,
  DocumentMetadata,
  VariableDefinition,
  PluginReference,
} from "./document/types";
export type {
  PopupAnimation,
  PopupAutoTrigger,
  PopupBehavior,
  PopupDefinition,
  PopupKind,
  PopupKindConfig,
  PopupModalConfig,
  PopupBottomSheetConfig,
  PopupDrawerConfig,
  PopupBarConfig,
  PopupFullscreenConfig,
  PopupPlacement,
  PopupRules,
  PopupRuntimeStateConfig,
  PopupStackMode,
  PopupTemplate,
  PopupNodeTemplate,
  PopupGoal,
  PopupVariant,
  PopupExperiment,
  PopupAnalyticsEvent,
} from "./document/popups";
export {
  createDefaultPopupDefinition,
  getDefaultPopupAnimation,
  getDefaultPopupBehavior,
  getDefaultPopupKindConfig,
} from "./document/popups";
export type { PopupLifecycleState, PopupStackEntry } from "./popups/lifecycle";
export type {
  NormalizedVariantWeight,
  ResolveAssignmentInput,
  ResolveAssignmentResult,
  ResolvedPopup,
} from "./popups/experiment";
export {
  normalizeWeights,
  pickVariant,
  resolveVariantAssignment,
  resolvePopupForVariant,
  seededRng,
} from "./popups/experiment";
export {
  DEFAULT_POPUP_Z_INDEX_BASE,
  POPUP_Z_INDEX_STEP,
  computeZIndex,
  isMounted as isPopupMounted,
  mountedEntries as mountedPopupEntries,
  topmostInteractive as topmostInteractivePopup,
  findEntry as findPopupEntry,
  applyOpen as applyPopupOpen,
  applyClose as applyPopupClose,
  applyOpened as applyPopupOpened,
  applyClosed as applyPopupClosed,
  applyRemove as applyPopupRemove,
  shouldReduceMotion as shouldReducePopupMotion,
} from "./popups/lifecycle";
export type {
  InteractionConfig,
  InteractionTrigger,
  InteractionAction,
  Condition,
} from "./document/interactions";
export type {
  Asset,
  AssetManifest,
  AssetProvider,
  AssetQuery,
  AssetListResult,
  AssetType,
  MediaRef,
  Uploadable,
} from "./document/assets";
export { CURRENT_SCHEMA_VERSION } from "./document/constants";

// ── Responsive ─────────────────────────────────────────────────────────────
export type { Breakpoint, BreakpointConfig } from "./responsive/types";
export { DEFAULT_BREAKPOINTS, DEVICE_VIEWPORT_PRESETS } from "./responsive/constants";
export { resolveStyle, resolveProps, resolveVisibility } from "./responsive/resolver";

// ── Events ─────────────────────────────────────────────────────────────────
export { EventBus } from "./events/EventBus";
export type {
  BuilderEventMap,
  BuilderEventType,
  BuilderEvent,
  EventHandler,
  Unsubscribe,
} from "./events/types";

// ── Registry ───────────────────────────────────────────────────────────────
export { ComponentRegistry } from "./registry/ComponentRegistry";
export { GroupRegistry } from "./registry/GroupRegistry";
export type { GroupTreeNode } from "./registry/GroupRegistry";
export { defineComponent, defineComponentGroup, defineComponentSubGroup } from "./registry/defineComponent";
export type { ComponentConfig } from "./registry/defineComponent";
export { BUILT_IN_GROUPS, BUILT_IN_SUB_GROUPS } from "./registry/built-in-groups";
export type {
  ComponentDefinition,
  ComponentGroup,
  ComponentSubGroup,
  ComponentI18nMap,
  PropSchema,
  RichtextToolbarConfig,
  ComponentCapabilities,
  ContainerConfig,
  SlotConfig,
  ComponentLifecycle,
  ComponentContext,
  ComponentRenderer,
  ComponentA11yConfig,
  ComponentEditorConfig,
  EditorInteractionPolicy,
  QuickAction,
  SelectOption,
  ComponentFilter,
} from "./registry/types";

// ── Commands ───────────────────────────────────────────────────────────────
export { CommandEngine } from "./commands/CommandEngine";
export type {
  Command,
  ReversibleCommand,
  CommandResult,
  CommandHandler,
} from "./commands/types";
export {
  CMD_ADD_NODE,
  CMD_REMOVE_NODE,
  CMD_MOVE_NODE,
  CMD_REORDER_NODE,
  CMD_DUPLICATE_NODE,
  CMD_UPDATE_PROPS,
  CMD_UPDATE_STYLE,
  CMD_UPDATE_RESPONSIVE_STYLE,
  CMD_UPDATE_INTERACTIONS,
  CMD_RENAME_NODE,
  CMD_LOCK_NODE,
  CMD_UNLOCK_NODE,
  CMD_HIDE_NODE,
  CMD_SHOW_NODE,
  CMD_GROUP_NODES,
  CMD_UNGROUP_NODES,
  CMD_SET_VARIABLE,
  CMD_UPDATE_CANVAS_CONFIG,
  CMD_LOAD_COMPONENT,
  CMD_CREATE_POPUP,
  CMD_UPDATE_POPUP,
  CMD_DELETE_POPUP,
  CMD_DUPLICATE_POPUP,
  CMD_ENABLE_POPUP,
  CMD_DISABLE_POPUP,
  CMD_TOGGLE_RESPONSIVE_HIDDEN,
  CMD_UPDATE_RESPONSIVE_PROPS,
  CMD_RESET_RESPONSIVE_STYLE,
  CMD_ADD_POPUP_GOAL,
  CMD_UPDATE_POPUP_GOAL,
  CMD_REMOVE_POPUP_GOAL,
  CMD_ADD_POPUP_VARIANT,
  CMD_UPDATE_POPUP_VARIANT,
  CMD_REMOVE_POPUP_VARIANT,
  CMD_UPDATE_POPUP_EXPERIMENT,
  CMD_SET_CANVAS_MODE,
  CMD_SET_ACTIVE_POPUP,
  CMD_SET_ACTIVE_POPUP_SELECTION,
  CMD_SET_ACTIVE_POPUP_VARIANT,
  CMD_ENTER_TEXT_EDIT,
  CMD_EXIT_TEXT_EDIT,
  CMD_SET_THEME_COLORS,
} from "./commands/built-in";
export type {
  AddNodePayload,
  RemoveNodePayload,
  MoveNodePayload,
  UpdatePropsPayload,
  UpdateStylePayload,
  UpdateResponsiveStylePayload,
  UpdateInteractionsPayload,
  RenameNodePayload,
  GroupNodesPayload,
  SetVariablePayload,
  UpdateCanvasConfigPayload,
  CreatePopupPayload,
  UpdatePopupPayload,
  DeletePopupPayload,
  DuplicatePopupPayload,
  EnableDisablePopupPayload,
  ToggleResponsiveHiddenPayload,
  UpdateResponsivePropsPayload,
  ResetResponsiveStylePayload,
  SetCanvasModePayload,
  SetActivePopupPayload,
  SetActivePopupSelectionPayload,
  AddPopupGoalPayload,
  UpdatePopupGoalPayload,
  RemovePopupGoalPayload,
  AddPopupVariantPayload,
  UpdatePopupVariantPayload,
  RemovePopupVariantPayload,
  UpdatePopupExperimentPayload,
  SetActivePopupVariantPayload,
  EnterTextEditPayload,
  ExitTextEditPayload,
  SetThemeColorsPayload,
} from "./commands/built-in";

// ── History ────────────────────────────────────────────────────────────────
export { HistoryStack } from "./history/HistoryStack";
export type { HistoryEntry, HistoryState } from "./history/types";

// ── State ──────────────────────────────────────────────────────────────────
export type {
  BuilderState,
  EditorState,
  PopupSelectionMode,
  InteractionState,
  UIState,
  DragOperation,
  DragSource,
  DropTarget,
  DropPosition,
  ResizeOperation,
  ClipboardData,
  PanelState,
  EditorTool,
  CanvasMode,
} from "./state/types";

// ── Plugins ────────────────────────────────────────────────────────────────
export { PluginEngine } from "./plugins/PluginEngine";
export type { BuilderPlugin, PluginAPI } from "./plugins/types";
export { PopupTemplateRegistry } from "./popups/PopupTemplateRegistry";

// ── Validation ─────────────────────────────────────────────────────────────
export { DocumentValidator } from "./validation/DocumentValidator";
export { validateDocument, validatePropSchema } from "./validation/validators";
export type { DropValidationResult, DropValidator } from "./validation/types";

// ── Migration ──────────────────────────────────────────────────────────────
export { MigrationEngine } from "./migration/MigrationEngine";
export type { SchemaMigration } from "./migration/types";
export { popupV3Migration } from "./migration/popupV3Migration";
export { popupV4Migration } from "./migration/popupV4Migration";

// ── Properties (shared descriptor system) ──────────────────────────────────
export {
  createStyleProperty,
  createPropProperty,
  STYLE_PROPERTIES,
  PROP_PROPERTIES,
} from "./properties/PropertyDescriptor";
export type {
  PropertyDescriptor,
  PropertyCategory,
} from "./properties/PropertyDescriptor";
// ── Presets ────────────────────────────────────────────────────────────────
export { PresetRegistry } from "./presets/PresetRegistry";
export type {
  ComponentPreset,
  PresetChildNode,
} from "./presets/types";
export type {
  PaletteCatalog,
  PaletteGroup,
  PaletteType,
  PaletteItem,
  PaletteDragData,
} from "./presets/palette-types";
export type {
  PresetKind,
  PresetCatalogItem,
  PresetSlotDefinition,
  PresetAuthoringConfig,
  PresetNodeEditorConfig,
  PresetNodeConstraints,
  PresetNodeDefinition,
  PresetPlacementPolicy,
  PresetDefinition,
} from "./presets/schema";
export {
  detectPresetVersion,
  isPresetDefinition,
  migrateComponentPreset,
  migratePaletteItem,
  migratePreset,
  CURRENT_PRESET_VERSION as CURRENT_PRESET_SCHEMA_VERSION,
  LEGACY_PRESET_VERSION,
} from "./presets/migrate";
export {
  PRESET_NODE_PLUGIN_DATA_KEY,
  presetToDocument,
  documentToPreset,
} from "./presets/document-adapter";
