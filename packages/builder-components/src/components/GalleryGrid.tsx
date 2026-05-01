import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

const DEFAULT_IMAGES = [
  { src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&q=80", alt: "Mountain lake" },
  { src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80", alt: "Mountain peaks" },
  { src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80", alt: "Sunrise valley" },
  { src: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&q=80", alt: "Waterfall" },
  { src: "https://images.unsplash.com/photo-1440342359743-84fcb8c21f21?w=400&q=80", alt: "Coast road" },
  { src: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80", alt: "Aerial forest" },
];

/** Build per-slot propSchema for N image slots */
function buildSlotSchema(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    key: `slot${i}`,
    label: `Image ${i + 1}`,
    type: "group" as const,
    children: [
      { key: `slot${i}_src`, label: "Image", type: "image" as const },
      { key: `slot${i}_alt`, label: "Alt text", type: "string" as const, default: "" },
      { key: `slot${i}_caption`, label: "Caption", type: "string" as const, default: "" },
    ],
  }));
}

const MAX_SLOTS = 12;

export const GalleryGridComponent: ComponentDefinition = {
  type: "GalleryGrid",
  name: "Gallery Grid",
  category: "media",
  group: "gallery",
  subGroup: "gallery-grid",
  description: "A responsive image grid gallery with per-image picker and captions.",
  version: "2.0.0",
  tags: ["gallery", "grid", "images", "photos", "masonry"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "columns", label: "Columns", type: "number", default: 3, min: 1, max: 6 },
    { key: "gap", label: "Gap", type: "number", default: 8, min: 0, max: 48, step: 2, unit: "px" },
    { key: "imageCount", label: "Number of Images", type: "slider", min: 1, max: MAX_SLOTS, default: 6 },
    {
      key: "aspectRatio",
      label: "Cell Aspect Ratio",
      type: "select",
      options: [
        { value: "1/1", label: "1:1 Square" },
        { value: "4/3", label: "4:3" },
        { value: "16/9", label: "16:9" },
        { value: "3/4", label: "3:4 Portrait" },
      ],
      default: "1/1",
    },
    {
      key: "layout",
      label: "Layout",
      type: "select",
      options: [
        { value: "grid", label: "Grid" },
        { value: "masonry", label: "Masonry" },
      ],
      default: "grid",
    },
    // Individual image slots (shown up to imageCount)
    ...buildSlotSchema(MAX_SLOTS),
  ],
  defaultProps: {
    columns: 3,
    gap: 8,
    imageCount: 6,
    aspectRatio: "1/1",
    layout: "grid",
    // Pre-fill first 6 slots with defaults
    ...Object.fromEntries(
      DEFAULT_IMAGES.flatMap((img, i) => [
        [`slot${i}_src`, img.src],
        [`slot${i}_alt`, img.alt],
        [`slot${i}_caption`, ""],
      ])
    ),
  },
  defaultStyle: { width: "100%", padding: "16px" },

  editorRenderer: ({ node, style }) => {
    const cols = Number(node.props.columns ?? 3);
    const gap = Number(node.props.gap ?? 8);
    const layout = String(node.props.layout ?? "grid");
    const aspect = String(node.props.aspectRatio ?? "1/1");
    const count = Math.max(1, Math.min(MAX_SLOTS, Number(node.props.imageCount ?? 6)));

    const imgs = Array.from({ length: count }, (_, i) => {
      const fallback = DEFAULT_IMAGES[i % DEFAULT_IMAGES.length] ?? DEFAULT_IMAGES[0]!;
      return {
        src: String(node.props[`slot${i}_src`] ?? fallback.src),
        alt: String(node.props[`slot${i}_alt`] ?? ""),
        caption: String(node.props[`slot${i}_caption`] ?? ""),
      };
    });

    if (layout === "masonry") {
      return (
        <div
          data-node-id={node.id}
          style={{ ...(style as React.CSSProperties), columnCount: cols, columnGap: `${gap}px` } as React.CSSProperties}
        >
          {imgs.map((img, i) => (
            <div key={i} style={{ breakInside: "avoid", marginBottom: `${gap}px`, overflow: "hidden", borderRadius: 4, background: "#f3f4f6", position: "relative" }}>
              <img src={img.src} alt={img.alt} style={{ width: "100%", display: "block" }} draggable={false} />
              {img.caption && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, padding: "4px 6px" }}>
                  {img.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div
        data-node-id={node.id}
        style={{ ...(style as React.CSSProperties), display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px` }}
      >
        {imgs.map((img, i) => (
          <div key={i} style={{ aspectRatio: aspect, overflow: "hidden", borderRadius: 4, background: "#f3f4f6", position: "relative" }}>
            <img src={img.src} alt={img.alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} draggable={false} />
            {img.caption && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, padding: "4px 6px" }}>
                {img.caption}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  },

  runtimeRenderer: ({ node, style }) => {
    const cols = Number(node.props.columns ?? 3);
    const gap = Number(node.props.gap ?? 8);
    const layout = String(node.props.layout ?? "grid");
    const aspect = String(node.props.aspectRatio ?? "1/1");
    const count = Math.max(1, Math.min(MAX_SLOTS, Number(node.props.imageCount ?? 6)));

    const imgs = Array.from({ length: count }, (_, i) => {
      const fallback = DEFAULT_IMAGES[i % DEFAULT_IMAGES.length] ?? DEFAULT_IMAGES[0]!;
      return {
        src: String(node.props[`slot${i}_src`] ?? fallback.src),
        alt: String(node.props[`slot${i}_alt`] ?? ""),
        caption: String(node.props[`slot${i}_caption`] ?? ""),
      };
    });

    if (layout === "masonry") {
      return (
        <div style={{ ...(style as React.CSSProperties), columnCount: cols, columnGap: `${gap}px` } as React.CSSProperties}>
          {imgs.map((img, i) => (
            <div key={i} style={{ breakInside: "avoid", marginBottom: `${gap}px`, overflow: "hidden", borderRadius: 4, position: "relative" }}>
              <img src={img.src} alt={img.alt} style={{ width: "100%", display: "block" }} />
              {img.caption && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, padding: "4px 6px" }}>
                  {img.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={{ ...(style as React.CSSProperties), display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px` }}>
        {imgs.map((img, i) => (
          <div key={i} style={{ aspectRatio: aspect, overflow: "hidden", borderRadius: 4, position: "relative" }}>
            <img src={img.src} alt={img.alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            {img.caption && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, padding: "4px 6px" }}>
                {img.caption}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  },
};
