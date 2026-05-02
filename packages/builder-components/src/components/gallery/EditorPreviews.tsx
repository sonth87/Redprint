// ── Editor-only static previews for interactive layouts ──────────────────────
// These are lightweight static snapshots shown in the canvas editor.
// Runtime interactive components are in separate files.
import React from "react";
import type { GalleryItem, CarouselConfig } from "@ui-builder/shared";
import type { GalleryProps } from "./types";

export function SliderEditorPreview({
  items,
  p,
  cc,
  style,
}: {
  items: GalleryItem[];
  p: GalleryProps;
  cc: CarouselConfig;
  style?: React.CSSProperties;
}): React.ReactElement {
  const first = items[0]!;
  const hasExplicitHeight = !!style?.height;
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    borderRadius: `${p.borderRadius}px`,
    userSelect: "none",
    ...(!hasExplicitHeight && { aspectRatio: p.aspectRatio }),
    ...(hasExplicitHeight && { height: "100%" }),
  };
  const effectLabel: Record<string, string> = {
    slide: "",
    fade: "Fade",
    cube: "Cube",
    flip: "Flip",
    cards: "Cards",
    coverflow: "Coverflow",
    creative: "Creative",
  };
  const effectTag = effectLabel[cc.effect] || "";
  return (
    <div style={containerStyle}>
      {first.src ? (
        <img
          src={first.src}
          alt={first.alt ?? ""}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#cbd5e1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 40, fontWeight: 700, color: "#fff", opacity: 0.6 }}>1</span>
        </div>
      )}
      {/* Slide count + effect badge */}
      <div style={{ position: "absolute", top: 8, right: 10, display: "flex", gap: 4 }}>
        {effectTag && (
          <span
            style={{
              background: "rgba(99,102,241,0.8)",
              color: "#fff",
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 99,
              fontWeight: 600,
            }}
          >
            {effectTag}
          </span>
        )}
        <span
          style={{
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
            fontSize: 11,
            padding: "2px 7px",
            borderRadius: 99,
          }}
        >
          1 / {items.length}
        </span>
      </div>
      {cc.navigation.enabled && items.length > 1 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            pointerEvents: "none",
          }}
        >
          {["‹", "›"].map((ch) => (
            <button
              key={ch}
              style={{
                width: cc.navigation.size * 0.72,
                height: cc.navigation.size * 0.72,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.85)",
                border: "none",
                fontSize: 18,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {ch}
            </button>
          ))}
        </div>
      )}
      {cc.pagination.enabled && items.length > 1 && cc.pagination.type === "bullets" && (
        <div
          style={{
            position: "absolute",
            bottom: cc.pagination.offset,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: cc.pagination.bulletGap,
          }}
        >
          {Array.from({ length: Math.min(items.length, 7) }).map((_, i) => (
            <div
              key={i}
              style={{
                width: cc.pagination.bulletSize,
                height: cc.pagination.bulletSize,
                borderRadius: "50%",
                background: i === 0 ? cc.pagination.color || "#fff" : "rgba(255,255,255,0.45)",
              }}
            />
          ))}
        </div>
      )}
      {cc.pagination.enabled && cc.pagination.type === "progressbar" && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: cc.pagination.progressbarSize,
            background: "rgba(255,255,255,0.25)",
          }}
        >
          <div
            style={{ width: "33%", height: "100%", background: cc.pagination.color || "#fff" }}
          />
        </div>
      )}
      {cc.pagination.enabled && cc.pagination.type === "fraction" && (
        <div
          style={{
            position: "absolute",
            bottom: cc.pagination.offset,
            left: 0,
            right: 0,
            textAlign: "center",
            color: cc.pagination.color || "#fff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          1 / {items.length}
        </div>
      )}
    </div>
  );
}

export function SlideshowEditorPreview({
  items,
  p,
  style,
}: {
  items: GalleryItem[];
  p: GalleryProps;
  style?: React.CSSProperties;
}): React.ReactElement {
  const first = items[0]!;
  const hasExplicitHeight = !!style?.height;
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    borderRadius: `${p.borderRadius}px`,
    userSelect: "none",
    minHeight: 200,
    ...(!hasExplicitHeight && { aspectRatio: "16/9" }),
    ...(hasExplicitHeight && { height: "100%" }),
  };
  return (
    <div style={containerStyle}>
      {first.src ? (
        <img
          src={first.src}
          alt={first.alt ?? ""}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 40, fontWeight: 700, color: "#fff", opacity: 0.5 }}>1</span>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
          padding: "40px 20px 16px",
        }}
      >
        {first.title ? (
          <p style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
            {first.title}
          </p>
        ) : (
          <p
            style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: 13, fontStyle: "italic" }}
          >
            Slideshow · {items.length} slides
          </p>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 10,
          background: "rgba(0,0,0,0.45)",
          color: "#fff",
          fontSize: 10,
          padding: "2px 6px",
          borderRadius: 99,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span>▶</span>
        <span>Auto</span>
      </div>
      {items.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {Array.from({ length: Math.min(items.length, 7) }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === 0 ? 20 : 8,
                height: 4,
                borderRadius: 2,
                background: i === 0 ? "#fff" : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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

export function Carousel3DEditorPreview({
  items,
  p,
}: {
  items: GalleryItem[];
  p: GalleryProps;
}): React.ReactElement {
  const left = items[items.length - 1] ?? items[0]!;
  const center = items[0]!;
  const right = items[1] ?? items[0]!;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 240,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: "800px",
        overflow: "hidden",
      }}
    >
      {[
        { img: left, tx: -160, ry: 45, scale: 0.72, z: 1, opacity: 0.6 },
        { img: center, tx: 0, ry: 0, scale: 1, z: 3, opacity: 1 },
        { img: right, tx: 160, ry: -45, scale: 0.72, z: 1, opacity: 0.6 },
      ].map(({ img, tx, ry, scale, z, opacity }, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 240,
            height: 170,
            transform: `translateX(${tx}px) rotateY(${ry}deg) scale(${scale})`,
            zIndex: z,
            opacity,
            overflow: "hidden",
            borderRadius: p.borderRadius,
            boxShadow: i === 1 ? "0 8px 24px rgba(0,0,0,0.22)" : "0 4px 12px rgba(0,0,0,0.1)",
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
  );
}
