import React from "react";
import type { GalleryItem } from "@ui-builder/shared";
import type { GalleryProps } from "./types";

export function ThumbnailsEditorPreview({
  items,
  p,
}: {
  items: GalleryItem[];
  p: GalleryProps;
}): React.ReactElement {
  const first = items[0]!;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${p.gap}px` }}>
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          overflow: "hidden",
          borderRadius: p.borderRadius,
          background: "#f3f4f6",
        }}
      >
        <img
          src={first.src}
          alt={first.alt ?? ""}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div style={{ display: "flex", gap: `${p.gap}px`, overflowX: "auto" }}>
        {items.map((img, i) => (
          <div
            key={img.id ?? i}
            style={{
              width: 64,
              height: 48,
              flexShrink: 0,
              overflow: "hidden",
              borderRadius: Math.max(2, p.borderRadius / 2),
              border: i === 0 ? "2px solid #4f46e5" : "2px solid transparent",
              background: "#f3f4f6",
            }}
          >
            <img
              src={img.src}
              alt={img.alt ?? ""}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
