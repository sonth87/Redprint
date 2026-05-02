// ── Carousel3DRuntime — CSS 3D rotating carousel (no Swiper) ─────────────────
import React, { useState, useCallback } from "react";
import type { GalleryItem } from "@ui-builder/shared";
import type { GalleryProps } from "./types";

export function Carousel3DRuntime({
  items,
  p,
}: {
  items: GalleryItem[];
  p: GalleryProps;
}): React.ReactElement {
  const [current, setCurrent] = useState(0);
  const count = items.length;
  const prev = useCallback(() => setCurrent((c) => (c - 1 + count) % count), [count]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % count), [count]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: "800px",
        overflow: "hidden",
      }}
    >
      {items.map((img, i) => {
        const offset = (i - current + count) % count;
        const adj = offset > count / 2 ? offset - count : offset;
        if (Math.abs(adj) > 2) return null;
        const isCenter = adj === 0;
        const tx = adj * 170;
        const ry = -adj * 40;
        const scale = isCenter ? 1 : 0.72;
        const zIndex = 10 - Math.abs(adj);
        const opacity = isCenter ? 1 : Math.abs(adj) === 1 ? 0.65 : 0.35;
        return (
          <div
            key={img.id ?? i}
            onClick={isCenter ? undefined : adj < 0 ? prev : next}
            style={{
              position: "absolute",
              width: 240,
              height: 180,
              transform: `translateX(${tx}px) rotateY(${ry}deg) scale(${scale})`,
              zIndex,
              opacity,
              overflow: "hidden",
              borderRadius: p.borderRadius,
              boxShadow: isCenter
                ? "0 8px 28px rgba(0,0,0,0.25)"
                : "0 4px 12px rgba(0,0,0,0.12)",
              cursor: isCenter ? "default" : "pointer",
              transition: "all 0.38s ease",
            }}
          >
            <img
              src={img.src}
              alt={img.alt ?? ""}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        );
      })}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.82)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: "pointer",
              zIndex: 20,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>
          <button
            onClick={next}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.82)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: "pointer",
              zIndex: 20,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
