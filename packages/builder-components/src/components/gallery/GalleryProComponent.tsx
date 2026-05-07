import React, { useRef, useState, useLayoutEffect } from "react";
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

interface GalleryRendererProps {
  node: { id: string; props: Record<string, unknown> };
  style: React.CSSProperties;
  isEditor: boolean;
}

function GalleryRenderer({ node, style, isEditor }: GalleryRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(Math.floor(w));
    });
    ro.observe(el);
    // measure immediately
    const initialW = el.getBoundingClientRect().width;
    if (initialW > 0) setContainerWidth(Math.floor(initialW));
    return () => ro.disconnect();
  }, []);

  const items = normalizeGalleryItems(node.props["items"]);
  const p = { ...extractProps(node.props), containerWidth };
  const cc = normalizeCarouselConfig(node.props["carouselConfig"] as CarouselConfig);
  const layoutMode = (node.props["layoutMode"] as GalleryLayoutMode) ?? "grid";
  const s = style as React.CSSProperties;
  const hasExplicitHeight = Boolean(s.height) && s.height !== "auto";

  if (isEditor) {
    const bleedFadeMask = "linear-gradient(to right, transparent, black 200px, black calc(100% - 200px), transparent)";
    const stretchStyle: React.CSSProperties = p.stretchFullWidth
      ? { marginLeft: "-250px", marginRight: "-250px", width: "calc(100% + 500px)", WebkitMaskImage: bleedFadeMask, maskImage: bleedFadeMask }
      : {};
    return (
      <div ref={containerRef} data-node-id={node.id} style={{ overflow: "hidden", ...s, ...stretchStyle }}>
        {renderByMode(layoutMode, items, p, cc, true, hasExplicitHeight)}
      </div>
    );
  }

  const stretchStyle: React.CSSProperties = p.stretchFullWidth
    ? { width: "100vw", marginLeft: "calc(-50vw + 50%)" }
    : {};
  return (
    <div ref={containerRef} style={{ ...s, ...stretchStyle }}>
      {renderByMode(layoutMode, items, p, cc, false, hasExplicitHeight)}
    </div>
  );
}

export const GalleryProComponent: ComponentDefinition = {
  type: "GalleryPro",
  name: "Gallery Pro",
  category: "media",
  group: "gallery",
  subGroup: "gallery-standard",
  description:
    "Advanced gallery with 15 layout modes. Click 'Manage Media' to add/reorder images, 'Settings' to change layout.",
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
    return <GalleryRenderer node={node} style={style as React.CSSProperties} isEditor={true} />;
  },

  runtimeRenderer: ({ node, style }) => {
    return <GalleryRenderer node={node} style={style as React.CSSProperties} isEditor={false} />;
  },
};
