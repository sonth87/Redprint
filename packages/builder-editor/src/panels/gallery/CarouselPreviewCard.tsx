/**
 * CarouselPreviewCard — animated mini previews for each carousel preset.
 * Used in the Layout tab of CarouselSettingsPanel.
 * Each preview visually conveys the effect/behavior of that preset.
 */
import React, { useState } from "react";
import { cn } from "@ui-builder/ui";
import type { CarouselPreset } from "@ui-builder/shared";

// ── Photo-like colors (reused from LayoutMiniPreview pattern) ─────────────────
const COLORS = [
  "bg-sky-200/80", "bg-amber-200/80", "bg-emerald-200/80",
  "bg-rose-200/80", "bg-violet-200/80", "bg-orange-200/80",
];
function c(i: number) { return COLORS[i % COLORS.length]!; }

// ── Individual preset previews ────────────────────────────────────────────────

function BasicPreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative w-full h-full overflow-hidden p-[3px]">
      <div className={cn("w-full h-full rounded-[2px] transition-all duration-500", c(0))}
        style={{ opacity: animated ? 1 : 0.75 }} />
      {animated && (
        <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
          {["‹", "›"].map(ch => (
            <div key={ch} className="w-3.5 h-3.5 rounded-full bg-white/80 flex items-center justify-center text-[7px] text-black/60 font-bold">{ch}</div>
          ))}
        </div>
      )}
      {animated && (
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
          {[1, 0, 0].map((a, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" style={{ opacity: a ? 1 : 0.4 }} />)}
        </div>
      )}
    </div>
  );
}

function FadePreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative w-full h-full overflow-hidden p-[3px]">
      <div className={cn("absolute inset-[3px] rounded-[2px]", c(1))} style={{ opacity: animated ? 0 : 1, transition: "opacity 0.5s" }} />
      <div className={cn("absolute inset-[3px] rounded-[2px]", c(0))} style={{ opacity: animated ? 1 : 0.3, transition: "opacity 0.5s" }} />
      {animated && <div className="absolute inset-[3px] flex items-center justify-center">
        <span className="text-[8px] text-white/70 font-semibold">Fade</span>
      </div>}
    </div>
  );
}

function PeekPreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative w-full h-full overflow-hidden p-[3px]">
      <div className="flex gap-[2px] h-full transition-transform duration-500"
        style={{ transform: animated ? "translateX(-8%)" : "translateX(0)" }}>
        <div className={cn("rounded-[2px] flex-shrink-0 h-full", c(0))} style={{ width: "82%", opacity: animated ? 1 : 0.8 }} />
        <div className={cn("rounded-[2px] flex-shrink-0 h-full", c(1))} style={{ width: "30%", opacity: 0.6 }} />
      </div>
    </div>
  );
}

function MultiPreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative w-full h-full overflow-hidden p-[3px]">
      <div className="flex gap-[2px] h-full transition-transform duration-500"
        style={{ transform: animated ? "translateX(-20%)" : "translateX(0)" }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={cn("rounded-[2px] flex-shrink-0 h-full", c(i))} style={{ width: "40%", opacity: animated ? 1 : 0.75 }} />
        ))}
      </div>
    </div>
  );
}

function CardsPreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ perspective: 200 }}>
      {[2, 1, 0].map((i) => (
        <div key={i} className={cn("absolute rounded-[2px] transition-all duration-400", c(i))}
          style={{
            width: "70%", height: "75%",
            transform: animated
              ? `translateY(${i * -3}px) scale(${1 - i * 0.06}) rotateX(${i * 2}deg)`
              : `translateY(${i * 4}px) scale(${1 - i * 0.1})`,
            zIndex: 3 - i,
            opacity: 1 - i * 0.2,
            transitionDelay: animated ? `${i * 30}ms` : "0ms",
          }}
        />
      ))}
    </div>
  );
}

function CoverflowPreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ perspective: 150 }}>
      {[
        { tx: -28, ry: 45, scale: 0.6, ci: 1 },
        { tx: 0,   ry: 0,  scale: 1,   ci: 0 },
        { tx: 28,  ry: -45, scale: 0.6, ci: 2 },
      ].map((card, i) => (
        <div key={i} className={cn("absolute rounded-[2px] transition-all duration-400", c(card.ci))}
          style={{
            width: 28, height: 22,
            transform: `translateX(${animated ? card.tx : card.tx * 0.7}px) rotateY(${animated ? card.ry : card.ry * 0.5}deg) scale(${card.scale})`,
            opacity: i === 1 ? 1 : (animated ? 0.6 : 0.4),
          }}
        />
      ))}
    </div>
  );
}

function CubePreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ perspective: 120 }}>
      <div className="relative transition-all duration-500"
        style={{
          width: 30, height: 26,
          transformStyle: "preserve-3d",
          transform: animated ? "rotateY(-40deg) rotateX(10deg)" : "rotateY(0deg) rotateX(0deg)",
        }}>
        {/* Front */}
        <div className={cn("absolute inset-0 rounded-[2px]", c(0))} />
        {/* Right */}
        <div className={cn("absolute inset-0 rounded-[2px]", c(1))}
          style={{ transform: "rotateY(90deg) translateZ(15px)", opacity: 0.7 }} />
        {/* Top */}
        <div className={cn("absolute inset-0 rounded-[2px]", c(2))}
          style={{ transform: "rotateX(90deg) translateZ(13px)", opacity: 0.5 }} />
      </div>
    </div>
  );
}

function FlipPreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ perspective: 150 }}>
      <div className="relative transition-all duration-600"
        style={{
          width: "70%", height: "75%",
          transformStyle: "preserve-3d",
          transform: animated ? "rotateY(-70deg)" : "rotateY(0deg)",
        }}>
        <div className={cn("absolute inset-0 rounded-[2px]", c(0))} style={{ backfaceVisibility: "hidden" }} />
        <div className={cn("absolute inset-0 rounded-[2px]", c(3))} style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }} />
      </div>
    </div>
  );
}

function AutoplayPreview({ animated }: { animated: boolean }) {
  const [frame, setFrame] = useState(0);
  React.useEffect(() => {
    if (!animated) return;
    const t = setInterval(() => setFrame(f => (f + 1) % 3), 600);
    return () => clearInterval(t);
  }, [animated]);
  return (
    <div className="relative w-full h-full overflow-hidden p-[3px]">
      <div className={cn("w-full h-full rounded-[2px] transition-all duration-300", c(frame))} style={{ opacity: animated ? 1 : 0.75 }} />
      {animated && (
        <div className="absolute top-1.5 left-1.5 bg-black/50 rounded-full flex items-center justify-center" style={{ width: 12, height: 12 }}>
          <span style={{ fontSize: 5, color: "#fff" }}>▶</span>
        </div>
      )}
      {animated && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
          <div className="h-full bg-white transition-all duration-300" style={{ width: `${((frame + 1) / 3) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function GridRowsPreview({ animated }: { animated: boolean }) {
  return (
    <div className="w-full h-full p-[3px] grid grid-cols-2 grid-rows-2 gap-[2px]">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className={cn("rounded-[1px] transition-all duration-300", c(i))}
          style={{ opacity: animated ? 1 : 0.7, transform: animated ? "scale(1.02)" : "scale(1)", transitionDelay: `${i * 40}ms` }} />
      ))}
    </div>
  );
}

// ── Preview dispatcher ────────────────────────────────────────────────────────

function CarouselMiniPreview({ presetId, animated }: { presetId: string; animated: boolean }) {
  switch (presetId) {
    case "basic":      return <BasicPreview animated={animated} />;
    case "fade":       return <FadePreview animated={animated} />;
    case "peek":       return <PeekPreview animated={animated} />;
    case "multi":      return <MultiPreview animated={animated} />;
    case "cards":      return <CardsPreview animated={animated} />;
    case "coverflow":  return <CoverflowPreview animated={animated} />;
    case "cube":       return <CubePreview animated={animated} />;
    case "flip":       return <FlipPreview animated={animated} />;
    case "autoplay":   return <AutoplayPreview animated={animated} />;
    case "grid":       return <GridRowsPreview animated={animated} />;
    default:           return <BasicPreview animated={animated} />;
  }
}

// ── CarouselPresetCard (exported) ─────────────────────────────────────────────

export interface CarouselPresetCardProps {
  preset: CarouselPreset;
  selected: boolean;
  onClick: () => void;
}

export function CarouselPresetCard({ preset, selected, onClick }: CarouselPresetCardProps) {
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
        <CarouselMiniPreview presetId={preset.id} animated={hovered || selected} />
      </div>
      <div>
        <p className="text-[10px] font-semibold leading-none">{preset.label}</p>
        <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{preset.description}</p>
      </div>
    </button>
  );
}
