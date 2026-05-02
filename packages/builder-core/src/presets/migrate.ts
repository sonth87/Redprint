import type { Breakpoint } from "../responsive/types";
import type { PaletteItem } from "./palette-types";
import type { PresetDefinition, PresetKind, PresetNodeDefinition } from "./schema";
import type { ComponentPreset, PresetChildNode } from "./types";

const CURRENT_PRESET_VERSION = "2.0.0";
const LEGACY_PRESET_VERSION = "1.0.0";

type LegacyChildNode = PresetChildNode & {
  name?: string;
  responsiveProps?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  responsiveStyle?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  interactions?: unknown[];
  role?: string;
  slot?: string;
  children?: LegacyChildNode[];
};

type LegacyPaletteItem = PaletteItem & {
  category?: string;
  children?: LegacyChildNode[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isPresetDefinition(value: unknown): value is PresetDefinition {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.version === "string" &&
    typeof value.kind === "string" &&
    isObject(value.root) &&
    typeof value.root.id === "string"
  );
}

export function detectPresetVersion(value: unknown): string {
  if (isPresetDefinition(value)) {
    return value.version;
  }

  if (isObject(value) && typeof value.version === "string") {
    return value.version;
  }

  return LEGACY_PRESET_VERSION;
}

function inferPresetKind(input: {
  componentType: string;
  children?: unknown[];
  type?: string;
}): PresetKind {
  if (input.componentType === "Section" && (input.children?.length ?? 0) > 0) {
    return "section";
  }
  if (input.type === "group" || (input.children?.length ?? 0) > 0) {
    return "composite";
  }
  return "variant";
}

function inferAuthoringConfig(kind: PresetKind) {
  if (kind === "section") {
    return {
      mode: kind,
      preferredViewport: "desktop" as const,
      canvasMode: "flow" as const,
      treeMode: "semantic" as const,
      insertionPolicy: "guided" as const,
    };
  }

  if (kind === "composite") {
    return {
      mode: kind,
      preferredViewport: "desktop" as const,
      canvasMode: "flow" as const,
      treeMode: "raw" as const,
      insertionPolicy: "guided" as const,
    };
  }

  return {
    mode: kind,
    preferredViewport: "desktop" as const,
    canvasMode: "free" as const,
    treeMode: "raw" as const,
    insertionPolicy: "free" as const,
  };
}

function migrateChildNode(node: LegacyChildNode, path: string): PresetNodeDefinition {
  return {
    id: path,
    componentType: node.componentType,
    ...(node.name ? { name: node.name } : {}),
    ...(node.props ? { props: node.props } : {}),
    ...(node.style ? { style: node.style } : {}),
    ...(node.responsiveProps ? { responsiveProps: node.responsiveProps } : {}),
    ...(node.responsiveStyle ? { responsiveStyle: node.responsiveStyle as PresetNodeDefinition["responsiveStyle"] } : {}),
    ...(Array.isArray(node.interactions) ? { interactions: node.interactions as PresetNodeDefinition["interactions"] } : {}),
    ...(node.role ? { role: node.role } : {}),
    ...(node.slot ? { slot: node.slot } : {}),
    ...(node.children?.length
      ? {
          children: node.children.map((child, index) =>
            migrateChildNode(child, `${path}.${index}`),
          ),
        }
      : {}),
  };
}

export function migrateComponentPreset(input: ComponentPreset): PresetDefinition {
  const kind = inferPresetKind(input);

  return {
    id: input.id,
    version: CURRENT_PRESET_VERSION,
    kind,
    componentType: input.componentType,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.thumbnail ? { thumbnail: input.thumbnail } : {}),
    category: input.category,
    ...(input.tags ? { tags: input.tags } : {}),
    authoring: inferAuthoringConfig(kind),
    root: {
      id: "root",
      componentType: input.componentType,
      name: input.name,
      props: input.props,
      ...(input.style ? { style: input.style } : {}),
      ...(input.children?.length
        ? {
            children: input.children.map((child, index) =>
              migrateChildNode(child as LegacyChildNode, `root.${index}`),
            ),
          }
        : {}),
    },
  };
}

export function migratePaletteItem(input: LegacyPaletteItem): PresetDefinition {
  const kind = inferPresetKind(input);

  return {
    id: input.id,
    version: CURRENT_PRESET_VERSION,
    kind,
    componentType: input.componentType,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail } : {}),
    ...(input.tags ? { tags: input.tags } : {}),
    ...(input.i18n ? { i18n: input.i18n } : {}),
    ...(input.purpose ? { purpose: input.purpose } : {}),
    ...(input.industryHints ? { industryHints: input.industryHints } : {}),
    ...(input.layoutVariant ? { layoutVariant: input.layoutVariant } : {}),
    ...(input.category ? { category: input.category } : {}),
    authoring: inferAuthoringConfig(kind),
    root: {
      id: "root",
      componentType: input.componentType,
      name: input.name,
      ...(input.props ? { props: input.props } : {}),
      ...(input.style ? { style: input.style } : {}),
      ...(input.responsiveProps ? { responsiveProps: input.responsiveProps } : {}),
      ...(input.responsiveStyle ? { responsiveStyle: input.responsiveStyle } : {}),
      ...(input.children?.length
        ? {
            children: input.children.map((child, index) =>
              migrateChildNode(child, `root.${index}`),
            ),
          }
        : {}),
    },
  };
}

export function migratePreset(
  input: PresetDefinition | ComponentPreset | LegacyPaletteItem,
): PresetDefinition {
  if (isPresetDefinition(input)) {
    return input;
  }

  if ("type" in input || "purpose" in input || "layoutVariant" in input || "i18n" in input) {
    return migratePaletteItem(input as LegacyPaletteItem);
  }

  return migrateComponentPreset(input as ComponentPreset);
}

export { CURRENT_PRESET_VERSION, LEGACY_PRESET_VERSION };

