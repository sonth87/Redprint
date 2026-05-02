import React, { useMemo } from "react";
import type { ComponentRegistry } from "@ui-builder/builder-core";
import { migratePaletteItem } from "@ui-builder/builder-core";
import type { PaletteItem } from "../types/palette.types";
import { SectionPresetEditor } from "./SectionPresetEditor";
import { VariantPresetEditor } from "./VariantPresetEditor";
import { CompositePresetEditor } from "./CompositePresetEditor";

export interface PresetEditorProps {
  item: PaletteItem;
  registry: ComponentRegistry;
  onReset: () => void;
  onChange?: (updatedItem: PaletteItem) => void;
  /** All available presets — used by AddChildDialog to offer clone options */
  allPresets?: PaletteItem[];
}

/**
 * Routes to the appropriate editor based on the preset kind.
 */
export function PresetEditor(props: PresetEditorProps) {
  const { item } = props;
  
  const preset = useMemo(() => migratePaletteItem({
    id: item.id,
    type: item.type ?? (item.children?.length ? "group" : "variant"),
    componentType: item.componentType,
    name: item.name,
    description: item.description,
    thumbnail: item.thumbnail,
    i18n: item.i18n,
    props: item.props,
    style: item.style,
    responsiveProps: item.responsiveProps as any,
    responsiveStyle: item.responsiveStyle as any,
    children: item.children as any,
    tags: item.tags,
    purpose: item.purpose,
    industryHints: item.industryHints,
    layoutVariant: item.layoutVariant,
    category: item.category,
  }), [item]);

  if (preset.kind === "section") {
    return <SectionPresetEditor {...props} />;
  }

  if (preset.kind === "composite") {
    return <CompositePresetEditor {...props} />;
  }

  return <VariantPresetEditor {...props} />;
}
