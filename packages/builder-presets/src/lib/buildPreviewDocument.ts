import type { BuilderDocument, PresetDefinition, StyleConfig } from "@ui-builder/builder-core";
import { migratePaletteItem, presetToDocument } from "@ui-builder/builder-core";
import type { PaletteItem, PaletteItemChild } from "../types/palette.types";

function buildTransientPaletteItem(
  type: string,
  props: Record<string, unknown>,
  style: Partial<StyleConfig>,
  children?: PaletteItemChild[],
): PaletteItem {
  return {
    id: "__preview__",
    componentType: type,
    name: `${type} Preview`,
    props,
    style: style as Record<string, unknown>,
    children,
  };
}

export function buildPreviewDocument(item: PaletteItem): BuilderDocument;
export function buildPreviewDocument(
  type: string,
  props: Record<string, unknown>,
  style: Partial<StyleConfig>,
  children?: PaletteItemChild[],
): BuilderDocument;
export function buildPreviewDocument(
  itemOrType: PaletteItem | string,
  props?: Record<string, unknown>,
  style?: Partial<StyleConfig>,
  children?: PaletteItemChild[],
): BuilderDocument {
  const item = typeof itemOrType === "string"
    ? buildTransientPaletteItem(itemOrType, props ?? {}, style ?? {}, children)
    : itemOrType;

  const preset: PresetDefinition = migratePaletteItem({
    id: item.id,
    type: item.type ?? (item.children?.length ? "group" : "variant"),
    componentType: item.componentType,
    name: item.name,
    description: item.description,
    thumbnail: item.thumbnail,
    i18n: item.i18n,
    props: item.props,
    style: item.style,
    responsiveProps: item.responsiveProps as PresetDefinition["root"]["responsiveProps"],
    responsiveStyle: item.responsiveStyle as PresetDefinition["root"]["responsiveStyle"],
    children: item.children as any,
    tags: item.tags,
    purpose: item.purpose,
    industryHints: item.industryHints,
    layoutVariant: item.layoutVariant,
    category: item.category,
  });

  return presetToDocument(preset, {
    id: "preview-doc",
    name: item.name,
    description: item.description,
  });
}
