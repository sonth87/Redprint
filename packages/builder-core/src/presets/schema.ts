import type { InteractionConfig } from "../document/interactions";
import type { StyleConfig } from "../document/types";
import type { Breakpoint } from "../responsive/types";

export type PresetKind = "variant" | "composite" | "section";

export interface PresetCatalogItem {
  id: string;
  presetId: string;
  type: PresetKind;
  componentType: string;
  name: string;
  description?: string;
  thumbnail?: string | null;
  tags?: string[];
  purpose?: string;
  layoutVariant?: string;
}

export interface PresetSlotDefinition {
  id: string;
  label: string;
  description?: string;
  accepts?: string[];
  maxItems?: number;
  required?: boolean;
}

export interface PresetAuthoringConfig {
  mode?: PresetKind;
  preferredViewport?: Breakpoint;
  canvasMode?: "flow" | "free";
  treeMode?: "raw" | "semantic";
  insertionPolicy?: "strict" | "guided" | "free";
  slotDefinitions?: PresetSlotDefinition[];
}

export interface PresetNodeEditorConfig {
  label?: string;
  icon?: string;
  editable?: boolean;
  removable?: boolean;
  duplicable?: boolean;
  movable?: boolean;
  editableProps?: string[];
  editableStyleSections?: string[];
  lockedStructure?: boolean;
  hiddenInTree?: boolean;
  preferredAddFlow?: "quick-add" | "slot-picker" | "preset-picker";
}

export interface PresetNodeConstraints {
  canContainChildren?: boolean;
  acceptedChildTypes?: string[];
  acceptedPresetKinds?: PresetKind[];
  acceptedSlots?: string[];
  minChildren?: number;
  maxChildren?: number;
  allowedTransforms?: Array<"wrap" | "unwrap" | "replace" | "duplicate" | "move">;
}

export interface PresetNodeDefinition {
  id: string;
  componentType: string;
  name?: string;
  props?: Record<string, unknown>;
  style?: Partial<StyleConfig>;
  responsiveProps?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  responsiveStyle?: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
  interactions?: InteractionConfig[];
  role?: string;
  slot?: string;
  editor?: PresetNodeEditorConfig;
  constraints?: PresetNodeConstraints;
  children?: PresetNodeDefinition[];
}

export interface PresetPlacementPolicy {
  target: "root-section" | "inside-slot" | "free" | "replace-node";
  acceptedParentTypes?: string[];
  acceptedSlotIds?: string[];
}

export interface PresetDefinition {
  id: string;
  version: string;
  kind: PresetKind;
  componentType: string;
  name: string;
  description?: string;
  thumbnail?: string | null;
  category?: string;
  tags?: string[];
  i18n?: Record<string, { name?: string; description?: string }>;
  purpose?: string;
  industryHints?: string[];
  layoutVariant?: string;
  extendsPresetId?: string;
  authoring?: PresetAuthoringConfig;
  placement?: PresetPlacementPolicy;
  root: PresetNodeDefinition;
}

