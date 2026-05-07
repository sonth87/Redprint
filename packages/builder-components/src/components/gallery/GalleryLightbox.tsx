import React, { useState, useEffect, useCallback } from "react";
import type { GalleryItem } from "@ui-builder/shared";

interface LightboxProps {
  items: GalleryItem[];
  initialIndex: number;
  onClose: () => void;
}

const navBtnStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  background: "rgba(255,255,255,0.12)",
  border: "none",
  borderRadius: "50%",
  color: "#fff",
  fontSize: 28,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  lineHeight: 1,
};

export function GalleryLightbox({ items, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const current = items[index];

  const prev = useCallback(() => setIndex((i) => (i - 1 + items.length) % items.length), [items.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % items.length), [items.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      {/* Close */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          width: 36,
          height: 36,
          background: "rgba(255,255,255,0.12)",
          border: "none",
          borderRadius: "50%",
          color: "#fff",
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
        aria-label="Close"
      >
        ×
      </button>

      {/* Main image + nav */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}
      >
        <button onClick={prev} style={navBtnStyle} aria-label="Previous">‹</button>

        <img
          src={current?.src ?? ""}
          alt={current?.alt ?? ""}
          style={{
            maxWidth: "90vw",
            maxHeight: "72vh",
            objectFit: "contain",
            borderRadius: 8,
            display: "block",
            boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
          }}
        />

        <button onClick={next} style={navBtnStyle} aria-label="Next">›</button>
      </div>

      {/* Thumbnail strip */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          maxWidth: "90vw",
          padding: "4px 2px",
        }}
      >
        {items.map((img, i) => (
          <div
            key={img.id}
            onClick={() => setIndex(i)}
            style={{
              flexShrink: 0,
              width: 52,
              height: 38,
              borderRadius: 4,
              overflow: "hidden",
              cursor: "pointer",
              outline: i === index ? "2px solid #6366f1" : "2px solid transparent",
              opacity: i === index ? 1 : 0.55,
              transition: "opacity 0.15s, outline 0.15s",
            }}
          >
            <img
              src={img.src}
              alt={img.alt ?? ""}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
