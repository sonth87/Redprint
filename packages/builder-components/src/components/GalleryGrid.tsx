import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

export const GalleryGridComponent: ComponentDefinition = {
  type: "GalleryGrid",
  name: "Gallery Grid",
  category: "media",
  group: "gallery",
  subGroup: "gallery-grid",
  description: "A responsive image grid gallery layout.",
  version: "1.0.0",
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
    { key: "gap", label: "Gap (px)", type: "number", default: 8, min: 0, max: 48 },
    { key: "images", label: "Images (JSON array of {src, alt})", type: "json" },
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
  ],
  defaultProps: {
    columns: 3,
    gap: 8,
    aspectRatio: "1/1",
    images: [
      { src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&q=80", alt: "Image 1" },
      { src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80", alt: "Image 2" },
      { src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80", alt: "Image 3" },
      { src: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&q=80", alt: "Image 4" },
      { src: "https://images.unsplash.com/photo-1440342359743-84fcb8c21f21?w=400&q=80", alt: "Image 5" },
      { src: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80", alt: "Image 6" },
    ],
  },
  defaultStyle: { width: "100%", padding: "16px" },
  editorRenderer: ({ node, style }) => {
    const cols = Number(node.props.columns ?? 3);
    const gap = Number(node.props.gap ?? 8);
    const aspect = String(node.props.aspectRatio ?? "1/1");
    const imgs = Array.isArray(node.props.images) ? (node.props.images as { src: string; alt: string }[]) : [];

    return (
      <div
        data-node-id={node.id}
        style={{ ...(style as React.CSSProperties), display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px` }}
      >
        {imgs.map((img, i) => (
          <div key={i} style={{ aspectRatio: aspect, overflow: "hidden", borderRadius: 4, background: "#f3f4f6" }}>
            <img src={img.src} alt={img.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
          </div>
        ))}
        {imgs.length === 0 &&
          Array.from({ length: cols * 2 }, (_, i) => (
            <div key={i} style={{ aspectRatio: aspect, background: "#f3f4f6", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 11 }}>
              {i + 1}
            </div>
          ))}
      </div>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const cols = Number(node.props.columns ?? 3);
    const gap = Number(node.props.gap ?? 8);
    const aspect = String(node.props.aspectRatio ?? "1/1");
    const imgs = Array.isArray(node.props.images) ? (node.props.images as { src: string; alt: string }[]) : [];

    return (
      <div style={{ ...(style as React.CSSProperties), display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px` }}>
        {imgs.map((img, i) => (
          <div key={i} style={{ aspectRatio: aspect, overflow: "hidden", borderRadius: 4 }}>
            <img src={img.src} alt={img.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>
    );
  },
};
