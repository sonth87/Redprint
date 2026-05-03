import React, { useState } from "react";
import type { GalleryItem } from "@ui-builder/shared";
import type { GalleryProps } from "./types";

export function ThumbnailsRuntime({
  items,
  p,
}: {
  items: GalleryItem[];
  p: GalleryProps;
}): React.ReactElement {
  const [active, setActive] = useState(0);
  const current = items[active] ?? items[0]!;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${p.gap}px` }}>
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          overflow: "hidden",
          borderRadius: p.borderRadius,
          background: "#f3f4f6",
          position: "relative",
        }}
      >
        <img
          src={current.src}
          alt={current.alt ?? ""}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {(current.title || current.description) && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
              color: "#fff",
              padding: "32px 16px 12px",
            }}
          >
            {current.title && (
              <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{current.title}</p>
            )}
            {current.description && (
              <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.85 }}>
                {current.description}
              </p>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: `${p.gap}px`, overflowX: "auto" }}>
        {items.map((img, i) => (
          <button
            key={img.id ?? i}
            onClick={() => setActive(i)}
            style={{
              padding: 0,
              border: i === active ? "2px solid #4f46e5" : "2px solid transparent",
              borderRadius: Math.max(2, p.borderRadius / 2),
              overflow: "hidden",
              background: "#f3f4f6",
              cursor: "pointer",
              flexShrink: 0,
              transition: "border-color 0.15s",
            }}
          >
            <img
              src={img.src}
              alt={img.alt ?? ""}
              style={{ width: 64, height: 48, objectFit: "cover", display: "block" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
