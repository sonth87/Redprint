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

/**
 * Expand a CSS box shorthand (`padding` / `margin`) into its four sides,
 * following the 1–4 value CSS rule (top, right, bottom, left).
 * Returns undefined when there is no shorthand to expand.
 */
function expandShorthand(
  raw: string | undefined,
): { top: string; right: string; bottom: string; left: string } | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return undefined;
  const [a, b = a, c = a, d = b] = parts;
  return { top: a!, right: b!, bottom: c!, left: d! };
}

/**
 * Resolve the value for one side, preferring an explicit longhand but falling
 * back to the matching side of a shorthand so e.g. "80px 24px" shows 80 on the
 * vertical sides and 24 on the horizontal ones (not 80 everywhere).
 */
function resolveValue(
  style: Record<string, any>,
  individual: string,
  shorthand: string,
  side: "top" | "right" | "bottom" | "left",
): string {
  if (style[individual] !== undefined && style[individual] !== null) {
    return String(style[individual]);
  }
  const expanded = expandShorthand(style[shorthand]);
  if (expanded) return expanded[side];
  return "";
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
    top:    resolveValue(style, "marginTop",    "margin", "top"),
    right:  resolveValue(style, "marginRight",  "margin", "right"),
    bottom: resolveValue(style, "marginBottom", "margin", "bottom"),
    left:   resolveValue(style, "marginLeft",   "margin", "left"),
  };
  const p = {
    top:    resolveValue(style, "paddingTop",    "padding", "top"),
    right:  resolveValue(style, "paddingRight",  "padding", "right"),
    bottom: resolveValue(style, "paddingBottom", "padding", "bottom"),
    left:   resolveValue(style, "paddingLeft",   "padding", "left"),
  };

  const sizeLabel = elementSize
    ? `${elementSize.width} × ${elementSize.height}`
    : null;

  /**
   * Build the onChange for one side of padding/margin. The editor works in
   * per-side longhands, but stored styles may use a `padding`/`margin` shorthand
   * (e.g. "80px 24px"). Writing a longhand while the shorthand remains is
   * ambiguous in inline CSS (the shorthand wins), so on edit we expand the
   * shorthand into all four sides, clear it, then apply the edited side.
   */
  const makeSideHandler =
    (prop: "padding" | "margin", side: "Top" | "Right" | "Bottom" | "Left") =>
    (v: string | undefined) => {
      const shorthand = expandShorthand(style[prop]);
      if (shorthand) {
        onStyleChange(prop, undefined);
        onStyleChange(`${prop}Top`, style[`${prop}Top`] ?? shorthand.top);
        onStyleChange(`${prop}Right`, style[`${prop}Right`] ?? shorthand.right);
        onStyleChange(`${prop}Bottom`, style[`${prop}Bottom`] ?? shorthand.bottom);
        onStyleChange(`${prop}Left`, style[`${prop}Left`] ?? shorthand.left);
      }
      onStyleChange(`${prop}${side}`, v);
    };

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
            <ScrubLabel value={m.top} side="top" allowAuto onChange={makeSideHandler("margin", "Top")} />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-center" style={{ height: 18 }}>
          <div className="flex items-center h-full">
            <ScrubLabel value={m.bottom} side="bottom" allowAuto onChange={makeSideHandler("margin", "Bottom")} />
          </div>
        </div>
        <div className="absolute top-0 bottom-0 left-0 flex items-center" style={{ width: 14 }}>
          <div className="flex justify-center w-full">
            <ScrubLabel value={m.left} side="left" allowAuto onChange={makeSideHandler("margin", "Left")} />
          </div>
        </div>
        <div className="absolute top-0 bottom-0 right-0 flex items-center" style={{ width: 14 }}>
          <div className="flex justify-center w-full">
            <ScrubLabel value={m.right} side="right" allowAuto onChange={makeSideHandler("margin", "Right")} />
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
              <ScrubLabel value={p.top} side="top" onChange={makeSideHandler("padding", "Top")} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex justify-center" style={{ height: 18 }}>
            <div className="flex items-center h-full">
              <ScrubLabel value={p.bottom} side="bottom" onChange={makeSideHandler("padding", "Bottom")} />
            </div>
          </div>
          <div className="absolute top-0 bottom-0 left-0 flex items-center" style={{ width: 14 }}>
            <div className="flex justify-center w-full">
              <ScrubLabel value={p.left} side="left" onChange={makeSideHandler("padding", "Left")} />
            </div>
          </div>
          <div className="absolute top-0 bottom-0 right-0 flex items-center" style={{ width: 14 }}>
            <div className="flex justify-center w-full">
              <ScrubLabel value={p.right} side="right" onChange={makeSideHandler("padding", "Right")} />
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
