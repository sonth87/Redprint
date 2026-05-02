import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import {
  type GalleryLayoutMode,
  GALLERY_LAYOUT_MODES,
  DEFAULT_GALLERY_ITEMS,
  normalizeGalleryItems,
  type CarouselConfig,
  DEFAULT_CAROUSEL_CONFIG,
  normalizeCarouselConfig,
} from "@ui-builder/shared";
import { extractProps } from "./types";
import { renderByMode } from "./renderByMode";

const PROP_SCHEMA = [
  {
    key: "layoutMode",
    label: "Layout",
    type: "select" as const,
    options: GALLERY_LAYOUT_MODES.map((m) => ({ value: m.value, label: m.label })),
    default: "grid",
    description:
      "Use the Settings button on the canvas toolbar for full layout picker with previews.",
  },
  {
    key: "gap",
    label: "Gap",
    type: "number" as const,
    default: 12,
    min: 0,
    max: 60,
    step: 2,
    unit: "px",
  },
];

export const GalleryProComponent: ComponentDefinition = {
  type: "GalleryPro",
  name: "Gallery Pro",
  category: "media",
  group: "gallery",
  subGroup: "gallery-standard",
  description:
    "Advanced gallery with 13 layout modes. Click 'Manage Media' to add/reorder images, 'Settings' to change layout.",
  version: "3.0.0",
  tags: [
    "gallery",
    "grid",
    "masonry",
    "slider",
    "collage",
    "honeycomb",
    "freestyle",
    "3d",
    "stacked",
  ],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: PROP_SCHEMA,
  defaultProps: {
    layoutMode: "grid",
    gap: 12,
    columns: 3,
    aspectRatio: "1/1",
    imageFit: "cover",
    borderRadius: 4,
    items: DEFAULT_GALLERY_ITEMS,
    carouselConfig: DEFAULT_CAROUSEL_CONFIG,
  },
  defaultStyle: { width: "100%", padding: "0px" },

  editorRenderer: ({ node, style }) => {
    const items = normalizeGalleryItems(node.props["items"]);
    const p = extractProps(node.props);
    const cc = normalizeCarouselConfig(node.props["carouselConfig"]);
    const layoutMode = (node.props["layoutMode"] as GalleryLayoutMode) ?? "grid";
    const s = style as React.CSSProperties;
    return (
      <div data-node-id={node.id} style={{ overflow: "hidden", ...s }}>
        {renderByMode(layoutMode, items, p, cc, true)}
      </div>
    );
  },

  runtimeRenderer: ({ node, style }) => {
    const items = normalizeGalleryItems(node.props["items"]);
    const p = extractProps(node.props);
    const cc = normalizeCarouselConfig(node.props["carouselConfig"] as CarouselConfig);
    const layoutMode = (node.props["layoutMode"] as GalleryLayoutMode) ?? "grid";
    const s = style as React.CSSProperties;
    return <div style={{ ...s }}>{renderByMode(layoutMode, items, p, cc, false)}</div>;
  },
};
