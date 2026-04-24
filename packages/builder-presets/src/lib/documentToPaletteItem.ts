import type { BuilderDocument, PresetDefinition, PresetNodeDefinition } from "@ui-builder/builder-core";
import { documentToPreset, migratePaletteItem } from "@ui-builder/builder-core";
import type { PaletteItem, PaletteItemChild } from "../types/palette.types";

function presetNodeToPaletteChild(node: PresetNodeDefinition): PaletteItemChild {
  return {
    componentType: node.componentType,
    ...(node.name ? { name: node.name } : {}),
    ...(node.props ? { props: node.props } : {}),
    ...(node.style ? { style: node.style as Record<string, unknown> } : {}),
    ...(node.responsiveProps ? { responsiveProps: node.responsiveProps as Record<string, unknown> } : {}),
    ...(node.responsiveStyle ? { responsiveStyle: node.responsiveStyle as Record<string, unknown> } : {}),
    ...(node.interactions ? { interactions: node.interactions } : {}),
    ...(node.slot ? { slot: node.slot } : {}),
    ...(node.role ? { role: node.role } : {}),
    ...(node.children?.length
      ? { children: node.children.map((child: PresetNodeDefinition) => presetNodeToPaletteChild(child)) }
      : {}),
  };
}

export function documentToPaletteItem(original: PaletteItem, doc: BuilderDocument): PaletteItem {
  const basePreset: PresetDefinition = migratePaletteItem({
    id: original.id,
    type: original.type ?? (original.children?.length ? "group" : "variant"),
    componentType: original.componentType,
    name: original.name,
    description: original.description,
    thumbnail: original.thumbnail,
    i18n: original.i18n,
    props: original.props,
    style: original.style,
    responsiveProps: original.responsiveProps as PresetDefinition["root"]["responsiveProps"],
    responsiveStyle: original.responsiveStyle as PresetDefinition["root"]["responsiveStyle"],
    children: original.children as any,
    tags: original.tags,
    purpose: original.purpose,
    industryHints: original.industryHints,
    layoutVariant: original.layoutVariant,
    category: original.category,
  });

  const preset = documentToPreset(doc, basePreset);

  return {
    ...original,
    type: preset.kind === "variant" ? "variant" : "group",
    componentType: preset.componentType,
    name: preset.name,
    description: preset.description,
    thumbnail: preset.thumbnail,
    props: preset.root.props ?? {},
    style: preset.root.style as Record<string, unknown> | undefined,
    responsiveProps: preset.root.responsiveProps as Record<string, unknown> | undefined,
    responsiveStyle: preset.root.responsiveStyle as Record<string, unknown> | undefined,
    tags: preset.tags,
    i18n: preset.i18n,
    purpose: preset.purpose,
    industryHints: preset.industryHints,
    layoutVariant: preset.layoutVariant,
    category: preset.category,
    children: preset.root.children?.map((child: PresetNodeDefinition) => presetNodeToPaletteChild(child)),
  };
}
