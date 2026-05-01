import React, { useState, useCallback, useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import {
  Navigation, Pagination, Autoplay as SwiperAutoplay, Scrollbar, FreeMode,
  EffectFade, EffectCube, EffectFlip, EffectCards, EffectCoverflow, EffectCreative,
  Keyboard, Mousewheel, A11y, Grid, Zoom, Virtual, HashNavigation,
} from "swiper/modules";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import {
  type GalleryItem,
  type GalleryLayoutMode,
  GALLERY_LAYOUT_MODES,
  DEFAULT_GALLERY_ITEMS,
  normalizeGalleryItems,
  seededRandom,
  type CarouselConfig,
  DEFAULT_CAROUSEL_CONFIG,
  normalizeCarouselConfig,
} from "@ui-builder/shared";

// ── Internal props shape ──────────────────────────────────────────────────────

interface GalleryProps {
  gap: number;
  columns: number;
  aspectRatio: string;
  showArrows: boolean;
  showDots: boolean;
  autoPlay: boolean;
  autoPlaySpeed: number;
  loop: boolean;
  imageFit: "cover" | "contain" | "fill";
  borderRadius: number;
}

function extractProps(props: Record<string, unknown>): GalleryProps {
  return {
    gap: Number(props["gap"] ?? 12),
    columns: Math.max(1, Math.min(6, Number(props["columns"] ?? 3))),
    aspectRatio: String(props["aspectRatio"] ?? "1/1"),
    showArrows: props["showArrows"] !== false,
    showDots: props["showDots"] !== false,
    autoPlay: Boolean(props["autoPlay"]),
    autoPlaySpeed: Number(props["autoPlaySpeed"] ?? 3000),
    loop: props["loop"] !== false,
    imageFit: (props["imageFit"] as GalleryProps["imageFit"]) ?? "cover",
    borderRadius: Number(props["borderRadius"] ?? 4),
  };
}

// ── Standard layout renderers (pure, no hooks) ────────────────────────────────

function renderGrid(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const br = `${p.borderRadius}px`;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${p.columns}, 1fr)`, gap: `${p.gap}px` }}>
      {items.map((img, i) => (
        <div key={img.id ?? i} style={{ aspectRatio: p.aspectRatio, overflow: "hidden", borderRadius: br, background: "#f3f4f6" }}>
          <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: p.imageFit, display: "block", borderRadius: br }} />
        </div>
      ))}
    </div>
  );
}

function renderMasonry(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const br = `${p.borderRadius}px`;
  return (
    <div style={{ columnCount: p.columns, columnGap: `${p.gap}px` } as React.CSSProperties}>
      {items.map((img, i) => (
        <div key={img.id ?? i} style={{ breakInside: "avoid", marginBottom: `${p.gap}px`, overflow: "hidden", borderRadius: br, background: "#f3f4f6" }}>
          <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", display: "block", borderRadius: br }} />
        </div>
      ))}
    </div>
  );
}

function renderCollage(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const br = `${p.borderRadius}px`;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "200px", gap: `${p.gap}px` }}>
      {items.map((img, i) => (
        <div
          key={img.id ?? i}
          style={{
            ...(i === 0 ? { gridColumn: "span 2", gridRow: "span 2" } : {}),
            overflow: "hidden", borderRadius: br, background: "#f3f4f6",
          }}
        >
          <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: br }} />
        </div>
      ))}
    </div>
  );
}

function renderStrip(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const br = `${p.borderRadius}px`;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gridAutoRows: "200px", gap: `${p.gap}px` }}>
      {items.map((img, i) => (
        <div
          key={img.id ?? i}
          style={{
            ...(i === 0 ? { gridRow: "span 2", minHeight: `${400 + p.gap}px` } : {}),
            overflow: "hidden", borderRadius: br, background: "#f3f4f6",
          }}
        >
          <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: br }} />
        </div>
      ))}
    </div>
  );
}

function renderColumn(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${p.gap}px` }}>
      {items.map((img, i) => (
        <div key={img.id ?? i} style={{ width: "100%", overflow: "hidden", borderRadius: p.borderRadius, background: "#f3f4f6" }}>
          <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", display: "block" }} />
        </div>
      ))}
    </div>
  );
}

function renderBricks(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const br = `${p.borderRadius}px`;
  const rows: GalleryItem[][] = [];
  let i = 0;
  let isDouble = true;
  while (i < items.length) {
    rows.push(isDouble ? items.slice(i, i + 2) : [items[i]!]);
    i += isDouble ? 2 : 1;
    isDouble = !isDouble;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${p.gap}px` }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap: `${p.gap}px` }}>
          {row.map((img, ci) => (
            <div key={img.id ?? `${ri}-${ci}`} style={{ flex: 1, aspectRatio: p.aspectRatio, overflow: "hidden", borderRadius: br, background: "#f3f4f6" }}>
              <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: br }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function renderHoneycomb(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const hexClip = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
  const cellSize = 110;
  const rowH = cellSize * 0.866;
  const rows = Math.ceil(items.length / p.columns);
  const containerH = rows * (rowH + p.gap) + cellSize * 0.134;

  return (
    <div style={{ position: "relative", width: "100%", height: containerH }}>
      {items.map((img, i) => {
        const col = i % p.columns;
        const row = Math.floor(i / p.columns);
        const isOdd = row % 2 === 1;
        const x = col * (cellSize + p.gap) + (isOdd ? (cellSize + p.gap) / 2 : 0);
        const y = row * (rowH + p.gap);
        return (
          <div
            key={img.id ?? i}
            style={{ position: "absolute", left: x, top: y, width: cellSize, height: cellSize, clipPath: hexClip, overflow: "hidden", background: "#f3f4f6" }}
          >
            <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
    </div>
  );
}

function renderFreestyle(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const cellW = 160;
  const cellH = 120;
  const rowCount = Math.ceil(items.length / p.columns);
  const containerH = rowCount * (cellH + 40) + 60;

  return (
    <div style={{ position: "relative", width: "100%", height: containerH, overflow: "hidden" }}>
      {items.map((img, i) => {
        const col = i % p.columns;
        const row = Math.floor(i / p.columns);
        const rPos = seededRandom(`${img.id}_pos`);
        const rY = seededRandom(`${img.id}_y`);
        const rRot = seededRandom(`${img.id}_rot`);
        const rZ = seededRandom(`${img.id}_z`);
        const baseX = (col / p.columns) * (100 - 20);
        const offsetX = (rPos - 0.5) * 32;
        const offsetY = (rY - 0.5) * 24;
        const rotation = (rRot - 0.5) * 16;
        return (
          <div
            key={img.id ?? i}
            style={{
              position: "absolute",
              left: `calc(${baseX}% + ${offsetX}px)`,
              top: row * (cellH + 40) + offsetY + 20,
              width: cellW,
              height: cellH,
              transform: `rotate(${rotation}deg)`,
              zIndex: Math.floor(rZ * 10) + 1,
              overflow: "hidden",
              borderRadius: p.borderRadius + 2,
              background: "#f3f4f6",
              boxShadow: "2px 4px 12px rgba(0,0,0,0.18)",
            }}
          >
            <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
    </div>
  );
}

function renderStacked(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const visible = Math.min(items.length, 5);
  const w = 280;
  const h = 196;
  return (
    <div style={{ position: "relative", width: w + 40, height: h + visible * 8 + 20, margin: "0 auto" }}>
      {items.slice(0, visible).reverse().map((img, revIdx) => {
        const idx = visible - 1 - revIdx;
        const rotation = (idx - Math.floor(visible / 2)) * 3;
        return (
          <div
            key={img.id ?? idx}
            style={{
              position: "absolute",
              top: idx * 4,
              left: idx * 2,
              width: w,
              height: h,
              transform: `rotate(${rotation}deg)`,
              zIndex: idx + 1,
              overflow: "hidden",
              borderRadius: p.borderRadius + 4,
              background: "#f3f4f6",
              boxShadow: "1px 2px 10px rgba(0,0,0,0.14)",
              transformOrigin: "bottom center",
            }}
          >
            <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
    </div>
  );
}

// ── Editor static previews for interactive layouts ────────────────────────────

function SliderEditorPreview({ items, p, cc, style }: { items: GalleryItem[]; p: GalleryProps; cc: CarouselConfig; style?: React.CSSProperties }): React.ReactElement {
  const first = items[0]!;
  // Only use aspectRatio when no explicit height is set (same pattern as GallerySlider)
  const hasExplicitHeight = !!(style?.height);
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    borderRadius: `${p.borderRadius}px`,
    userSelect: "none",
    ...(!hasExplicitHeight && { aspectRatio: p.aspectRatio }),
    ...(hasExplicitHeight && { height: "100%" }),
  };
  const effectLabel: Record<string, string> = { slide: "", fade: "Fade", cube: "Cube", flip: "Flip", cards: "Cards", coverflow: "Coverflow", creative: "Creative" };
  const effectTag = effectLabel[cc.effect] || "";
  return (
    <div style={containerStyle}>
      {first.src ? (
        <img src={first.src} alt={first.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: "#fff", opacity: 0.6 }}>1</span>
        </div>
      )}
      {/* Slide count + effect badge */}
      <div style={{ position: "absolute", top: 8, right: 10, display: "flex", gap: 4 }}>
        {effectTag && <span style={{ background: "rgba(99,102,241,0.8)", color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 99, fontWeight: 600 }}>{effectTag}</span>}
        <span style={{ background: "rgba(0,0,0,0.35)", color: "#fff", fontSize: 11, padding: "2px 7px", borderRadius: 99 }}>1 / {items.length}</span>
      </div>
      {cc.navigation.enabled && items.length > 1 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", pointerEvents: "none" }}>
          {["‹", "›"].map((ch) => (
            <button key={ch} style={{ width: cc.navigation.size * 0.72, height: cc.navigation.size * 0.72, borderRadius: "50%", background: "rgba(255,255,255,0.85)", border: "none", fontSize: 18, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>{ch}</button>
          ))}
        </div>
      )}
      {cc.pagination.enabled && items.length > 1 && cc.pagination.type === "bullets" && (
        <div style={{ position: "absolute", bottom: cc.pagination.offset, left: 0, right: 0, display: "flex", justifyContent: "center", gap: cc.pagination.bulletGap }}>
          {Array.from({ length: Math.min(items.length, 7) }).map((_, i) => (
            <div key={i} style={{ width: cc.pagination.bulletSize, height: cc.pagination.bulletSize, borderRadius: "50%", background: i === 0 ? (cc.pagination.color || "#fff") : "rgba(255,255,255,0.45)" }} />
          ))}
        </div>
      )}
      {cc.pagination.enabled && cc.pagination.type === "progressbar" && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: cc.pagination.progressbarSize, background: "rgba(255,255,255,0.25)" }}>
          <div style={{ width: "33%", height: "100%", background: cc.pagination.color || "#fff" }} />
        </div>
      )}
      {cc.pagination.enabled && cc.pagination.type === "fraction" && (
        <div style={{ position: "absolute", bottom: cc.pagination.offset, left: 0, right: 0, textAlign: "center", color: cc.pagination.color || "#fff", fontSize: 13, fontWeight: 600 }}>1 / {items.length}</div>
      )}
    </div>
  );
}

function SlideshowEditorPreview({ items, p, style }: { items: GalleryItem[]; p: GalleryProps; style?: React.CSSProperties }): React.ReactElement {
  const first = items[0]!;
  const hasExplicitHeight = !!(style?.height);
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
        <img src={first.src} alt={first.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: "#fff", opacity: 0.5 }}>1</span>
        </div>
      )}
      {/* Gradient overlay with title — distinctive from slider */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "40px 20px 16px" }}>
        {first.title && (
          <p style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{first.title}</p>
        )}
        {!first.title && (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: 13, fontStyle: "italic" }}>Slideshow · {items.length} slides</p>
        )}
      </div>
      {/* Autoplay indicator */}
      <div style={{ position: "absolute", top: 8, left: 10, background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 99, display: "flex", alignItems: "center", gap: 4 }}>
        <span>▶</span>
        <span>Auto</span>
      </div>
      {/* Dots only — no arrows (different from slider) */}
      {items.length > 1 && (
        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
          {Array.from({ length: Math.min(items.length, 7) }).map((_, i) => (
            <div key={i} style={{ width: i === 0 ? 20 : 8, height: 4, borderRadius: 2, background: i === 0 ? "#fff" : "rgba(255,255,255,0.4)", transition: "width 0.3s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function ThumbnailsEditorPreview({ items, p }: { items: GalleryItem[]; p: GalleryProps }): React.ReactElement {
  const first = items[0]!;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${p.gap}px` }}>
      <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: p.borderRadius, background: "#f3f4f6" }}>
        <img src={first.src} alt={first.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ display: "flex", gap: `${p.gap}px`, overflowX: "auto" }}>
        {items.map((img, i) => (
          <div key={img.id ?? i} style={{ width: 64, height: 48, flexShrink: 0, overflow: "hidden", borderRadius: Math.max(2, p.borderRadius / 2), border: i === 0 ? "2px solid #4f46e5" : "2px solid transparent", background: "#f3f4f6" }}>
            <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Carousel3DEditorPreview({ items, p }: { items: GalleryItem[]; p: GalleryProps }): React.ReactElement {
  const left = items[items.length - 1] ?? items[0]!;
  const center = items[0]!;
  const right = items[1] ?? items[0]!;
  return (
    <div style={{ position: "relative", width: "100%", height: 240, display: "flex", alignItems: "center", justifyContent: "center", perspective: "800px", overflow: "hidden" }}>
      {[
        { img: left,   tx: -160, ry: 45,  scale: 0.72, z: 1, opacity: 0.6 },
        { img: center, tx: 0,    ry: 0,   scale: 1,    z: 3, opacity: 1   },
        { img: right,  tx: 160,  ry: -45, scale: 0.72, z: 1, opacity: 0.6 },
      ].map(({ img, tx, ry, scale, z, opacity }, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 240, height: 170,
            transform: `translateX(${tx}px) rotateY(${ry}deg) scale(${scale})`,
            zIndex: z, opacity,
            overflow: "hidden",
            borderRadius: p.borderRadius,
            boxShadow: i === 1 ? "0 8px 24px rgba(0,0,0,0.22)" : "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ))}
    </div>
  );
}

// ── Runtime interactive components ───────────────────────────────────────────

// Minimal CSS injected once per page for Swiper core + effects.
// Consumers can import full swiper/css for additional customization.
const SWIPER_CORE_CSS = `
.swiper{width:100%;height:100%;overflow:hidden;touch-action:pan-y}.swiper-wrapper{display:flex;align-items:stretch;box-sizing:content-box}.swiper-slide{flex-shrink:0;width:100%;height:100%;position:relative}.swiper-slide img{display:block;width:100%;height:100%;object-fit:cover}
.swiper-button-next,.swiper-button-prev{position:absolute;top:50%;z-index:10;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--swiper-navigation-color,#fff);width:var(--swiper-navigation-size,44px);height:var(--swiper-navigation-size,44px);margin-top:calc(-1 * var(--swiper-navigation-size,44px)/2)}.swiper-button-next{right:var(--swiper-navigation-sides-offset,4px)}.swiper-button-prev{left:var(--swiper-navigation-sides-offset,4px)}.swiper-button-next:after,.swiper-button-prev:after{font-size:calc(var(--swiper-navigation-size,44px)/2);font-weight:bold}.swiper-button-prev:after{content:'❮'}.swiper-button-next:after{content:'❯'}.swiper-button-disabled{opacity:.35;pointer-events:none}
.swiper-pagination{position:absolute;text-align:center;z-index:10;bottom:8px;left:0;width:100%}.swiper-pagination-bullet{display:inline-block;width:var(--swiper-pagination-bullet-width,8px);height:var(--swiper-pagination-bullet-height,8px);border-radius:50%;background:var(--swiper-pagination-bullet-inactive-color,#fff);opacity:var(--swiper-pagination-bullet-inactive-opacity,.2);margin:0 var(--swiper-pagination-bullet-horizontal-gap,4px);cursor:pointer;transition:opacity .2s}.swiper-pagination-bullet-active{opacity:1;background:var(--swiper-pagination-color,#fff)}.swiper-pagination-fraction{color:var(--swiper-pagination-fraction-color,#fff)}.swiper-pagination-progressbar{position:absolute;left:0;top:0;width:100%;height:4px;background:rgba(255,255,255,.25)}.swiper-pagination-progressbar .swiper-pagination-progressbar-fill{position:absolute;left:0;top:0;width:100%;height:100%;transform:scale(0);transform-origin:left top;background:var(--swiper-pagination-color,#fff);transition:transform .3s ease}
.swiper-slide-shadow,.swiper-slide-shadow-left,.swiper-slide-shadow-right,.swiper-slide-shadow-top,.swiper-slide-shadow-bottom{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:10}.swiper-slide-shadow{background:rgba(0,0,0,.15)}.swiper-slide-shadow-left{background:linear-gradient(to left,rgba(0,0,0,.5),rgba(0,0,0,0))}.swiper-slide-shadow-right{background:linear-gradient(to right,rgba(0,0,0,.5),rgba(0,0,0,0))}
.swiper-3d{perspective:1200px}.swiper-3d .swiper-wrapper{transform-style:preserve-3d}.swiper-3d .swiper-slide{transform-style:preserve-3d}
.swiper-fade .swiper-slide{pointer-events:none}.swiper-fade .swiper-slide-active{pointer-events:auto}.swiper-fade .swiper-slide{opacity:0 !important;transition-property:opacity}.swiper-fade .swiper-slide-active{opacity:1 !important}
.swiper-cards{overflow:visible}.swiper-cards .swiper-slide{transform-origin:center bottom;backface-visibility:hidden}
.swiper-scrollbar{border-radius:10px;background:rgba(0,0,0,.1);position:absolute;z-index:50}.swiper-scrollbar-drag{height:100%;width:100%;position:relative;left:0;top:0;border-radius:inherit;background:rgba(0,0,0,.5);cursor:grab}.swiper-horizontal>.swiper-scrollbar{position:absolute;left:1%;bottom:3px;z-index:50;height:5px;width:98%}
`;

let swiperStylesInjected = false;
function injectSwiperStyles() {
  if (swiperStylesInjected || typeof document === "undefined") return;
  const existing = document.getElementById("__swiper-gallery-css");
  if (existing) { swiperStylesInjected = true; return; }
  const style = document.createElement("style");
  style.id = "__swiper-gallery-css";
  style.textContent = SWIPER_CORE_CSS;
  document.head.appendChild(style);
  swiperStylesInjected = true;
}

// Unified Swiper component for slider / slideshow / carousel-3d modes.
// isEditor=true disables all touch/drag so it doesn't conflict with canvas interactions.
function SwiperSliderRuntime({ items, p, cc, isEditor = false }: { items: GalleryItem[]; p: GalleryProps; cc: CarouselConfig; isEditor?: boolean }): React.ReactElement {
  useEffect(() => { injectSwiperStyles(); }, []);

  // Dynamically include only needed modules (tree-shakeable)
  const modules = [
    Navigation, Pagination, SwiperAutoplay, Scrollbar, FreeMode,
    EffectFade, EffectCube, EffectFlip, EffectCards, EffectCoverflow, EffectCreative,
    Keyboard, Mousewheel, A11y,
    ...(cc.rows > 1 ? [Grid] : []),
    ...(cc.zoom ? [Zoom] : []),
    ...(cc.virtualSlides ? [Virtual] : []),
    ...(cc.hashNavigation ? [HashNavigation] : []),
  ];

  // Derive CSS custom properties for navigation/pagination colors
  const navColor = cc.navigation.color || "#ffffff";
  const pagColor = cc.pagination.color || "#ffffff";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        borderRadius: `${p.borderRadius}px`,
        // In editor: disable pointer events on Swiper so canvas click-to-select still works
        ...(isEditor && { pointerEvents: "none" }),
        "--swiper-navigation-color": navColor,
        "--swiper-navigation-size": `${cc.navigation.size}px`,
        "--swiper-navigation-sides-offset": `${cc.navigation.offset}px`,
        "--swiper-pagination-color": pagColor,
        "--swiper-pagination-bullet-inactive-color": pagColor,
        "--swiper-pagination-bullet-inactive-opacity": "0.35",
      } as React.CSSProperties}
    >
      <Swiper
        // Re-mount when effect changes (effects require different Swiper initialization)
        key={`${cc.effect}-${cc.direction}-${isEditor ? "ed" : "rt"}`}
        modules={modules}
        style={{ width: "100%", aspectRatio: cc.aspectRatio || p.aspectRatio } as React.CSSProperties}
        direction={cc.direction}
        slidesPerView={cc.slidesPerView}
        slidesPerGroup={cc.slidesPerGroup}
        grid={cc.rows > 1 ? { rows: cc.rows, fill: "row" } : undefined}
        spaceBetween={cc.spaceBetween}
        centeredSlides={cc.centeredSlides}
        initialSlide={cc.initialSlide}
        autoHeight={cc.autoHeight && !isEditor}
        grabCursor={isEditor ? false : cc.grabCursor}
        slideToClickedSlide={isEditor ? false : cc.slideToClickedSlide}
        allowTouchMove={!isEditor}
        simulateTouch={!isEditor}
        loop={!isEditor && cc.loopMode === "loop"}
        rewind={!isEditor && cc.loopMode === "rewind"}
        effect={cc.effect}
        fadeEffect={cc.effect === "fade" ? { crossFade: cc.fadeCrossFade } : undefined}
        cubeEffect={cc.effect === "cube" ? cc.cubeEffect : undefined}
        flipEffect={cc.effect === "flip" ? { slideShadows: cc.flipSlideShadows } : undefined}
        cardsEffect={cc.effect === "cards" ? cc.cardsEffect : undefined}
        coverflowEffect={cc.effect === "coverflow" ? cc.coverflowEffect : undefined}
        navigation={cc.navigation.enabled}
        pagination={cc.pagination.enabled ? {
          type: cc.pagination.type as "bullets" | "fraction" | "progressbar",
          clickable: cc.pagination.clickable,
          dynamicBullets: cc.pagination.dynamicBullets,
        } : undefined}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        autoplay={!isEditor && cc.autoplay.enabled ? ({
          delay: cc.autoplay.delay,
          stopOnInteraction: cc.autoplay.stopOnInteraction,
          pauseOnMouseEnter: cc.autoplay.pauseOnMouseEnter,
          reverseDirection: cc.autoplay.reverseDirection,
          disableOnInteraction: cc.autoplay.disableOnInteraction,
        } as any) : undefined}
        scrollbar={!isEditor && cc.scrollbar ? { draggable: cc.scrollbarDraggable } : undefined}
        freeMode={!isEditor && cc.freeMode ? { sticky: cc.freeModeSticky } : undefined}
        keyboard={!isEditor && cc.keyboard ? { enabled: true } : undefined}
        mousewheel={!isEditor && cc.mousewheel ? { enabled: true } : undefined}
        zoom={!isEditor && cc.zoom ? { maxRatio: cc.zoomMax } : undefined}
        a11y={cc.accessibility ? { enabled: true } : undefined}
        virtual={!isEditor && cc.virtualSlides}
        hashNavigation={!isEditor && cc.hashNavigation}
      >
        {items.map((img, i) => (
          <SwiperSlide key={img.id ?? i}>
            {img.link ? (
              <a href={img.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", height: "100%" }}>
                <img src={img.src} alt={img.alt ?? ""} style={{ width: "100%", height: "100%", objectFit: p.imageFit, display: "block" }} />
              </a>
            ) : (
              <img src={img.src} alt={img.alt ?? ""} style={{ width: "100%", height: "100%", objectFit: p.imageFit, display: "block" }} />
            )}
            {(img.title || img.description) && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.65))", color: "#fff", padding: "48px 20px 16px", pointerEvents: "none" }}>
                {img.title && <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{img.title}</p>}
                {img.description && <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>{img.description}</p>}
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

// ThumbnailsRuntime — main image + clickable thumbnail strip (no Swiper needed)

function ThumbnailsRuntime({ items, p }: { items: GalleryItem[]; p: GalleryProps }): React.ReactElement {
  const [active, setActive] = useState(0);
  const current = items[active] ?? items[0]!;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${p.gap}px` }}>
      <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: p.borderRadius, background: "#f3f4f6", position: "relative" }}>
        <img src={current.src} alt={current.alt ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {(current.title || current.description) && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", color: "#fff", padding: "32px 16px 12px" }}>
            {current.title && <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{current.title}</p>}
            {current.description && <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.85 }}>{current.description}</p>}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: `${p.gap}px`, overflowX: "auto" }}>
        {items.map((img, i) => (
          <button
            key={img.id ?? i}
            onClick={() => setActive(i)}
            style={{ padding: 0, border: i === active ? "2px solid #4f46e5" : "2px solid transparent", borderRadius: Math.max(2, p.borderRadius / 2), overflow: "hidden", background: "#f3f4f6", cursor: "pointer", flexShrink: 0, transition: "border-color 0.15s" }}
          >
            <img src={img.src} alt={img.alt ?? ""} style={{ width: 64, height: 48, objectFit: "cover", display: "block" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Carousel3DRuntime({ items, p }: { items: GalleryItem[]; p: GalleryProps }): React.ReactElement {
  const [current, setCurrent] = useState(0);
  const count = items.length;
  const prev = useCallback(() => setCurrent((c) => (c - 1 + count) % count), [count]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % count), [count]);

  return (
    <div style={{ position: "relative", width: "100%", height: 280, display: "flex", alignItems: "center", justifyContent: "center", perspective: "800px", overflow: "hidden" }}>
      {items.map((img, i) => {
        const offset = ((i - current + count) % count);
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
            onClick={isCenter ? undefined : (adj < 0 ? prev : next)}
            style={{
              position: "absolute",
              width: 240, height: 180,
              transform: `translateX(${tx}px) rotateY(${ry}deg) scale(${scale})`,
              zIndex, opacity,
              overflow: "hidden",
              borderRadius: p.borderRadius,
              boxShadow: isCenter ? "0 8px 28px rgba(0,0,0,0.25)" : "0 4px 12px rgba(0,0,0,0.12)",
              cursor: isCenter ? "default" : "pointer",
              transition: "all 0.38s ease",
            }}
          >
            <img src={img.src} alt={img.alt ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
      {count > 1 && (
        <>
          <button onClick={prev} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.82)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", zIndex: 20, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <button onClick={next} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.82)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", zIndex: 20, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </>
      )}
    </div>
  );
}

// ── renderByMode ──────────────────────────────────────────────────────────────

function renderByMode(mode: GalleryLayoutMode, items: GalleryItem[], p: GalleryProps, cc: CarouselConfig, isEditor: boolean, style?: React.CSSProperties): React.ReactElement {
  switch (mode) {
    case "grid":       return renderGrid(items, p);
    case "masonry":    return renderMasonry(items, p);
    case "collage":    return renderCollage(items, p);
    case "strip":      return renderStrip(items, p);
    case "column":     return renderColumn(items, p);
    case "bricks":     return renderBricks(items, p);
    case "honeycomb":  return renderHoneycomb(items, p);
    case "freestyle":  return renderFreestyle(items, p);
    case "stacked":    return renderStacked(items, p);
    case "slider":
    case "slideshow":
    case "carousel-3d":
      // Use real Swiper in both editor and runtime.
      // In editor: touch/drag/autoplay disabled so canvas interactions still work.
      return <SwiperSliderRuntime items={items} p={p} cc={cc} isEditor={isEditor} />;
    case "thumbnails":
      return isEditor ? <ThumbnailsEditorPreview items={items} p={p} /> : <ThumbnailsRuntime items={items} p={p} />;
    default:
      return renderGrid(items, p);
  }
}

// ── propSchema ────────────────────────────────────────────────────────────────

const PROP_SCHEMA = [
  {
    key: "layoutMode",
    label: "Layout",
    type: "select" as const,
    options: GALLERY_LAYOUT_MODES.map((m) => ({ value: m.value, label: m.label })),
    default: "grid",
    description: "Use the Settings button on the canvas toolbar for full layout picker with previews.",
  },
  { key: "gap", label: "Gap", type: "number" as const, default: 12, min: 0, max: 60, step: 2, unit: "px" },
];

// ── ComponentDefinition ───────────────────────────────────────────────────────

export const GalleryProComponent: ComponentDefinition = {
  type: "GalleryPro",
  name: "Gallery Pro",
  category: "media",
  group: "gallery",
  subGroup: "gallery-standard",
  description: "Advanced gallery with 13 layout modes. Click 'Manage Media' to add/reorder images, 'Settings' to change layout.",
  version: "3.0.0",
  tags: ["gallery", "grid", "masonry", "slider", "collage", "honeycomb", "freestyle", "3d", "stacked"],
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
  defaultStyle: { width: "100%", padding: "16px" },

  editorRenderer: ({ node, style }) => {
    const items = normalizeGalleryItems(node.props["items"]);
    const p = extractProps(node.props);
    const cc = normalizeCarouselConfig(node.props["carouselConfig"]);
    const layoutMode = (node.props["layoutMode"] as GalleryLayoutMode) ?? "grid";
    const s = style as React.CSSProperties;
    return (
      <div data-node-id={node.id} style={{ overflow: "hidden", ...s }}>
        {renderByMode(layoutMode, items, p, cc, true, s)}
      </div>
    );
  },

  runtimeRenderer: ({ node, style }) => {
    const items = normalizeGalleryItems(node.props["items"]);
    const p = extractProps(node.props);
    const cc = normalizeCarouselConfig(node.props["carouselConfig"]);
    const layoutMode = (node.props["layoutMode"] as GalleryLayoutMode) ?? "grid";
    const s = style as React.CSSProperties;
    const hasExplicitHeight = !!(s.height || s.minHeight || s.maxHeight);
    return (
      <div style={{ overflowX: "hidden", overflowY: hasExplicitHeight ? "auto" : "visible", ...s }}>
        {renderByMode(layoutMode, items, p, cc, false, s)}
      </div>
    );
  },
};
