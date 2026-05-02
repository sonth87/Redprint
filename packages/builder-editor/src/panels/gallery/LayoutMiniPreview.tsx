/**
 * LayoutMiniPreview — animated miniature previews for each gallery layout mode.
 *
 * Used in two places:
 * - GallerySettingsPanel: layout picker cards (40×52px area)
 * - ComponentPalette: gallery variant cards (full width, ~72px area)
 *
 * Blocks use varied photo-like colors to visually suggest images, not just shapes.
 */
import React, { useState } from "react";
import { cn } from "@ui-builder/ui";
import type { GalleryLayoutMode } from "@ui-builder/shared";

// ── Photo-like color palette ──────────────────────────────────────────────────
// Six tones that read as "placeholder photos" at small sizes

const C = [
  "bg-sky-200/70",
  "bg-amber-200/70",
  "bg-emerald-200/70",
  "bg-rose-200/70",
  "bg-violet-200/70",
  "bg-orange-200/70",
  "bg-teal-200/70",
  "bg-pink-200/70",
  "bg-lime-200/70",
];

function c(i: number) { return C[i % C.length]!; }

// ── Individual preview components ─────────────────────────────────────────────

function GridPreview({ animated }: { animated: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-[2px] w-full h-full p-[3px]">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className={cn("rounded-[1px] transition-all duration-300", c(i))}
          style={{
            transitionDelay: animated ? `${i * 25}ms` : "0ms",
            transform: animated ? "scale(1.04)" : "scale(1)",
            opacity: animated ? 1 : 0.75,
          }}
        />
      ))}
    </div>
  );
}

function MasonryPreview({ animated }: { animated: boolean }) {
  const cols = [[0, 1], [2, 3], [4, 5]];
  const heights = [[40, 24], [28, 36], [44, 20]];
  return (
    <div className="flex gap-[2px] w-full h-full p-[3px] items-start">
      {cols.map((colItems, ci) => (
        <div key={ci} className="flex-1 flex flex-col gap-[2px]">
          {colItems.map((item, ri) => (
            <div
              key={ri}
              className={cn("rounded-[1px] transition-all duration-500", c(item))}
              style={{
                height: animated ? `${heights[ci]![ri]! + (ri === 0 ? 8 : -4)}px` : `${heights[ci]![ri]}px`,
                transitionDelay: animated ? `${(ci + ri) * 50}ms` : "0ms",
                opacity: animated ? 1 : 0.75,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function CollagePreview({ animated }: { animated: boolean }) {
  return (
    <div className="grid gap-[2px] w-full h-full p-[3px]" style={{ gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr" }}>
      <div className={cn("rounded-[1px] row-span-2 transition-opacity duration-300", c(0))} style={{ opacity: animated ? 1 : 0.75 }} />
      <div className={cn("rounded-[1px] transition-opacity duration-300", c(1))} style={{ opacity: animated ? 0.9 : 0.65, transitionDelay: "60ms" }} />
      <div className={cn("rounded-[1px] transition-opacity duration-300", c(2))} style={{ opacity: animated ? 0.9 : 0.65, transitionDelay: "120ms" }} />
    </div>
  );
}

function SliderPreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative w-full h-full overflow-hidden p-[3px]">
      <div
        className="flex gap-[2px] h-full transition-transform duration-500 ease-in-out"
        style={{ transform: animated ? "translateX(-38%)" : "translateX(0)" }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("flex-shrink-0 rounded-[1px] h-full", c(i))} style={{ width: "55%" }} />
        ))}
      </div>
      {animated && (
        <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
          {["‹", "›"].map((ch) => (
            <div key={ch} className="w-3 h-3 rounded-full bg-white/70 flex items-center justify-center text-[6px] text-black/60">{ch}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SlideshowPreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative w-full h-full p-[3px] overflow-hidden">
      <div className={cn("w-full h-full rounded-[1px] transition-opacity duration-500", c(0))} style={{ opacity: animated ? 1 : 0.75 }} />
      <div
        className="absolute inset-[3px] rounded-[1px] flex flex-col justify-end"
        style={{ background: animated ? "linear-gradient(transparent, rgba(0,0,0,0.35))" : "none", transition: "background 0.4s" }}
      >
        {animated && <div className="h-[3px] w-[40%] bg-white/80 rounded-full mx-auto mb-[3px]" />}
      </div>
      {animated && (
        <div className="absolute top-[5px] left-[5px] flex gap-[2px] items-center">
          <div className="w-[5px] h-[5px] rounded-full bg-white/70" />
          <div className="w-[3px] h-[3px] rounded-full bg-white/40" />
        </div>
      )}
    </div>
  );
}

function ThumbnailsPreview({ animated }: { animated: boolean }) {
  return (
    <div className="flex flex-col gap-[2px] w-full h-full p-[3px]">
      <div className={cn("flex-1 rounded-[1px] transition-opacity duration-300", c(0))} style={{ opacity: animated ? 1 : 0.75 }} />
      <div className="flex gap-[2px]" style={{ height: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn("flex-1 rounded-[1px]", c(i))}
            style={{
              opacity: animated ? 1 : 0.6,
              outline: i === 1 && animated ? "1.5px solid rgba(99,102,241,0.8)" : "1.5px solid transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function StripPreview({ animated }: { animated: boolean }) {
  return (
    <div className="grid gap-[2px] w-full h-full p-[3px]" style={{ gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr" }}>
      <div className={cn("rounded-[1px] row-span-2 transition-opacity", c(0))} style={{ opacity: animated ? 1 : 0.75 }} />
      <div className={cn("rounded-[1px] transition-opacity", c(1))} style={{ opacity: animated ? 0.85 : 0.6, transitionDelay: "40ms" }} />
      <div className={cn("rounded-[1px] transition-opacity", c(2))} style={{ opacity: animated ? 0.85 : 0.6, transitionDelay: "80ms" }} />
    </div>
  );
}

function ColumnPreview({ animated }: { animated: boolean }) {
  return (
    <div className="flex flex-col gap-[2px] w-full h-full p-[3px]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-[1px] transition-all duration-300", c(i))}
          style={{ opacity: animated ? 1 : 0.7, transitionDelay: animated ? `${i * 50}ms` : "0ms" }}
        />
      ))}
    </div>
  );
}

function BricksPreview({ animated }: { animated: boolean }) {
  return (
    <div className="flex flex-col gap-[2px] w-full h-full p-[3px]">
      <div className="flex gap-[2px] flex-1">
        <div className={cn("flex-1 rounded-[1px]", c(0))} style={{ opacity: animated ? 1 : 0.7 }} />
        <div className={cn("flex-1 rounded-[1px]", c(1))} style={{ opacity: animated ? 1 : 0.7 }} />
      </div>
      <div className={cn("flex-1 rounded-[1px]", c(2))} style={{ opacity: animated ? 1 : 0.75 }} />
      <div className="flex gap-[2px] flex-1">
        <div className={cn("flex-1 rounded-[1px]", c(3))} style={{ opacity: animated ? 1 : 0.65 }} />
        <div className={cn("flex-1 rounded-[1px]", c(4))} style={{ opacity: animated ? 1 : 0.65 }} />
      </div>
    </div>
  );
}

function HoneycombPreview({ animated }: { animated: boolean }) {
  const hexClip = "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)";
  const positions = [
    { x: 2, y: 4, c: 0 }, { x: 18, y: 4, c: 1 }, { x: 34, y: 4, c: 2 },
    { x: 10, y: 16, c: 3 }, { x: 26, y: 16, c: 4 },
  ];
  return (
    <div className="relative w-full h-full overflow-hidden">
      {positions.map((pos, i) => (
        <div
          key={i}
          className={cn("absolute transition-all duration-300", c(pos.c))}
          style={{
            left: pos.x * 1.6 + 2, top: pos.y * 1.5 + 2,
            width: 16, height: 16,
            clipPath: hexClip,
            opacity: animated ? 1 : 0.65,
            transform: animated ? `scale(1.1)` : "scale(1)",
            transitionDelay: animated ? `${i * 40}ms` : "0ms",
          }}
        />
      ))}
    </div>
  );
}

function FreestylePreview({ animated }: { animated: boolean }) {
  const items = [
    { x: 4, y: 6, rot: -8, ci: 0 },
    { x: 26, y: 2, rot: 5, ci: 1 },
    { x: 15, y: 16, rot: -3, ci: 2 },
    { x: 6, y: 26, rot: 10, ci: 3 },
  ];
  return (
    <div className="relative w-full h-full overflow-hidden">
      {items.map((item, i) => (
        <div
          key={i}
          className={cn("absolute rounded-[1px] shadow-sm transition-all duration-400", c(item.ci))}
          style={{
            left: item.x * 1.4, top: item.y * 1.1,
            width: 20, height: 15,
            transform: animated ? `rotate(${item.rot}deg) scale(1.05)` : `rotate(${item.rot}deg)`,
            opacity: animated ? 1 : 0.65,
            transitionDelay: animated ? `${i * 40}ms` : "0ms",
          }}
        />
      ))}
    </div>
  );
}

function Carousel3DPreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ perspective: 120 }}>
      {[
        { tx: -20, ry: 42, scale: 0.62, ci: 2 },
        { tx: 0,   ry: 0,  scale: 1,    ci: 0 },
        { tx: 20,  ry: -42, scale: 0.62, ci: 1 },
      ].map((card, i) => (
        <div
          key={i}
          className={cn("absolute rounded-[2px] transition-all duration-400 shadow-sm", c(card.ci))}
          style={{
            width: 28, height: 20,
            transform: `translateX(${animated ? card.tx * 1.1 : card.tx}px) rotateY(${card.ry}deg) scale(${card.scale})`,
            opacity: i === 1 ? (animated ? 1 : 0.85) : (animated ? 0.65 : 0.4),
            transitionDelay: animated ? `${i * 30}ms` : "0ms",
          }}
        />
      ))}
    </div>
  );
}

function StackedPreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {[3, 2, 1, 0].map((i) => (
        <div
          key={i}
          className={cn("absolute rounded-[2px] shadow-sm transition-all duration-400", c(i))}
          style={{
            width: 36, height: 26,
            transform: animated
              ? `translateX(${(i - 1.5) * 14}px) rotate(${(i - 1.5) * 5}deg) scale(${i === 0 ? 1.05 : 0.82 - i * 0.04})`
              : `translateX(${i * 2}px) translateY(${i * 2}px) rotate(${(i - 1.5) * 2}deg)`,
            zIndex: 4 - i,
            opacity: animated ? 1 - i * 0.12 : 1 - i * 0.18,
            transitionDelay: animated ? `${i * 45}ms` : "0ms",
          }}
        />
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function LayoutMiniPreview({ mode, animated }: { mode: GalleryLayoutMode; animated: boolean }) {
  switch (mode) {
    case "grid":       return <GridPreview animated={animated} />;
    case "masonry":    return <MasonryPreview animated={animated} />;
    case "collage":    return <CollagePreview animated={animated} />;
    case "slider":     return <SliderPreview animated={animated} />;
    case "slideshow":  return <SlideshowPreview animated={animated} />;
    case "thumbnails": return <ThumbnailsPreview animated={animated} />;
    case "strip":      return <StripPreview animated={animated} />;
    case "column":     return <ColumnPreview animated={animated} />;
    case "bricks":     return <BricksPreview animated={animated} />;
    case "honeycomb":  return <HoneycombPreview animated={animated} />;
    case "freestyle":  return <FreestylePreview animated={animated} />;
    case "carousel-3d": return <Carousel3DPreview animated={animated} />;
    case "stacked":    return <StackedPreview animated={animated} />;
    default:           return <GridPreview animated={animated} />;
  }
}

// ── LayoutModeCard — preview card used in GallerySettingsPanel ────────────────

export interface LayoutModeCardProps {
  mode: { value: GalleryLayoutMode; label: string; description: string };
  selected: boolean;
  onClick: () => void;
}

export function LayoutModeCard({ mode, selected, onClick }: LayoutModeCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "flex flex-col items-start gap-1.5 p-2 rounded border transition-all text-left w-full",
        selected
          ? "ring-2 ring-primary border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-accent/40",
      )}
    >
      <div className="w-full h-[52px] overflow-hidden rounded-[2px] bg-muted/50">
        <LayoutMiniPreview mode={mode.value} animated={hovered || selected} />
      </div>
      <div>
        <p className="text-[10px] font-semibold leading-none">{mode.label}</p>
        <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{mode.description}</p>
      </div>
    </button>
  );
}
