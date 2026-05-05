import React from "react";
import { cn } from "@ui-builder/ui";
import { useScrubGesture } from "../../../hooks/useScrubGesture";
import { SPACING_MARGIN_COLOR, SPACING_PADDING_COLOR, SPACING_PANEL_FILL_OPACITY } from "../../../constants";

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(val: number, min?: number, max?: number) {
  if (min !== undefined && val < min) return min;
  if (max !== undefined && val > max) return max;
  return val;
}

function parseSpacingValue(raw: string | undefined): { num: number; unit: string; isAuto: boolean } {
  if (!raw || raw === "") return { num: 0, unit: "px", isAuto: false };
  if (raw === "auto") return { num: 0, unit: "px", isAuto: true };
  const unit = raw.replace(/[-\d.]+/, "") || "px";
  const num = parseFloat(raw) || 0;
  return { num, unit, isAuto: false };
}

function resolveValue(style: Record<string, any>, individual: string, shorthand: string): string {
  return String(style[individual] ?? style[shorthand] ?? "");
}

function displayNum(num: number): string {
  return num === 0 ? "-" : String(num);
}

// ── ScrubLabel ────────────────────────────────────────────────────────────────

interface ScrubLabelProps {
  value: string;
  side: "top" | "right" | "bottom" | "left";
  allowAuto?: boolean;
  onChange: (v: string | undefined) => void;
}

function ScrubLabel({ value, side, allowAuto = false, onChange }: ScrubLabelProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputVal, setInputVal] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { num, unit, isAuto } = parseSpacingValue(value);

  const { onMouseDown, isScrubbing } = useScrubGesture({
    getValue: () => num,
    onChange: (v) => onChange(clamp(v, 0) + unit),
    min: 0,
    disabled: isAuto,
  });

  const handleClick = (e: React.MouseEvent) => {
    if (isScrubbing) return;
    e.stopPropagation();
    setInputVal(isAuto ? "auto" : String(num));
    setIsEditing(true);
  };

  React.useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  const commit = (raw: string) => {
    setIsEditing(false);
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "0") {
      onChange(undefined);
    } else if (trimmed === "auto" && allowAuto) {
      onChange("auto");
    } else {
      const n = parseFloat(trimmed);
      if (!isNaN(n)) {
        onChange(clamp(n, 0) + unit);
      }
    }
  };

  const isHorizontal = side === "left" || side === "right";

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="w-8 text-center text-[10px] bg-background border border-primary rounded outline-none px-0.5"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(inputVal);
          if (e.key === "Escape") setIsEditing(false);
        }}
      />
    );
  }

  return (
    <span
      onMouseDown={onMouseDown}
      onClick={handleClick}
      className={cn(
        "text-[10px] font-mono select-none transition-colors",
        "text-muted-foreground hover:text-foreground",
        isAuto ? "cursor-default" : "cursor-ew-resize",
        isScrubbing && "pointer-events-none",
        isHorizontal ? "leading-none" : "",
      )}
      title={isAuto ? "auto" : `${num}${unit}`}
    >
      {isAuto ? "auto" : displayNum(num)}
    </span>
  );
}

// ── SpacingVisualizer ─────────────────────────────────────────────────────────

export interface SpacingVisualizerProps {
  style: Record<string, any>;
  onStyleChange: (key: string, value: string | undefined) => void;
  elementSize?: { width: number; height: number };
}

export function SpacingVisualizer({ style, onStyleChange, elementSize }: SpacingVisualizerProps) {
  const m = {
    top:    resolveValue(style, "marginTop",    "margin"),
    right:  resolveValue(style, "marginRight",  "margin"),
    bottom: resolveValue(style, "marginBottom", "margin"),
    left:   resolveValue(style, "marginLeft",   "margin"),
  };
  const p = {
    top:    resolveValue(style, "paddingTop",    "padding"),
    right:  resolveValue(style, "paddingRight",  "padding"),
    bottom: resolveValue(style, "paddingBottom", "padding"),
    left:   resolveValue(style, "paddingLeft",   "padding"),
  };

  const sizeLabel = elementSize
    ? `${elementSize.width} × ${elementSize.height}`
    : null;

  return (
    <div className="w-full select-none font-mono text-[10px]">
      {/* Margin box */}
      <div
        className="relative border border-dashed rounded"
        style={{
          padding: "18px 14px",
          backgroundColor: `hsl(${SPACING_MARGIN_COLOR} / ${SPACING_PANEL_FILL_OPACITY})`,
          borderColor: `hsl(${SPACING_MARGIN_COLOR} / 0.5)`,
        }}
      >
        {/* "margin" label */}
        <span className="absolute top-0.5 left-1.5 text-[9px] text-muted-foreground/50 uppercase tracking-widest">margin</span>

        {/* Margin scrub labels */}
        <div className="absolute top-0 left-0 right-0 flex justify-center" style={{ height: 18 }}>
          <div className="flex items-center h-full">
            <ScrubLabel value={m.top} side="top" allowAuto onChange={(v) => onStyleChange("marginTop", v)} />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-center" style={{ height: 18 }}>
          <div className="flex items-center h-full">
            <ScrubLabel value={m.bottom} side="bottom" allowAuto onChange={(v) => onStyleChange("marginBottom", v)} />
          </div>
        </div>
        <div className="absolute top-0 bottom-0 left-0 flex items-center" style={{ width: 14 }}>
          <div className="flex justify-center w-full">
            <ScrubLabel value={m.left} side="left" allowAuto onChange={(v) => onStyleChange("marginLeft", v)} />
          </div>
        </div>
        <div className="absolute top-0 bottom-0 right-0 flex items-center" style={{ width: 14 }}>
          <div className="flex justify-center w-full">
            <ScrubLabel value={m.right} side="right" allowAuto onChange={(v) => onStyleChange("marginRight", v)} />
          </div>
        </div>

        {/* Padding box */}
        <div
          className="relative border border-dashed rounded"
          style={{
            padding: "18px 14px",
            backgroundColor: `hsl(${SPACING_PADDING_COLOR} / ${SPACING_PANEL_FILL_OPACITY})`,
            borderColor: `hsl(${SPACING_PADDING_COLOR} / 0.5)`,
          }}
        >
          {/* "padding" label */}
          <span className="absolute top-0.5 left-1.5 text-[9px] text-muted-foreground/50 uppercase tracking-widest">padding</span>

          {/* Padding scrub labels */}
          <div className="absolute top-0 left-0 right-0 flex justify-center" style={{ height: 18 }}>
            <div className="flex items-center h-full">
              <ScrubLabel value={p.top} side="top" onChange={(v) => onStyleChange("paddingTop", v)} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex justify-center" style={{ height: 18 }}>
            <div className="flex items-center h-full">
              <ScrubLabel value={p.bottom} side="bottom" onChange={(v) => onStyleChange("paddingBottom", v)} />
            </div>
          </div>
          <div className="absolute top-0 bottom-0 left-0 flex items-center" style={{ width: 14 }}>
            <div className="flex justify-center w-full">
              <ScrubLabel value={p.left} side="left" onChange={(v) => onStyleChange("paddingLeft", v)} />
            </div>
          </div>
          <div className="absolute top-0 bottom-0 right-0 flex items-center" style={{ width: 14 }}>
            <div className="flex justify-center w-full">
              <ScrubLabel value={p.right} side="right" onChange={(v) => onStyleChange("paddingRight", v)} />
            </div>
          </div>

          {/* Content area */}
          <div className="flex items-center justify-center min-h-[28px] rounded bg-background/60 border border-border/40">
            {sizeLabel ? (
              <span className="text-[10px] text-muted-foreground/70">{sizeLabel}</span>
            ) : (
              <span className="text-[9px] text-muted-foreground/30 uppercase tracking-widest">content</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
