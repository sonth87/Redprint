import React, { useCallback } from "react";
import { cn } from "@ui-builder/ui";
import { CollapsibleSection } from "../controls/CollapsibleSection";

interface SpacingSectionProps {
  style: Record<string, unknown>;
  onStyleChange: (key: string, value: unknown) => void;
  onSpacingHover?: (type: "padding" | "margin" | null) => void;
}

/** Parse a CSS length value to a plain number (0 if empty/auto) */
function parseNum(val: unknown): number {
  if (!val || val === "auto") return 0;
  return Math.max(0, parseFloat(String(val)) || 0);
}

/** Compact drag-to-scrub input for the box model */
function SpacingInput({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: string) => void;
}) {
  const num = parseNum(value);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editVal, setEditVal] = React.useState("");
  const [isDragging, setIsDragging] = React.useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const startX = e.clientX;
      const startVal = num;
      let hasMoved = false;

      const onMove = (me: MouseEvent) => {
        const delta = me.clientX - startX;
        if (Math.abs(delta) > 2) {
          hasMoved = true;
          setIsDragging(true);
          const step = me.shiftKey ? 5 : 1;
          const newVal = Math.max(0, Math.round(startVal + delta * step));
          onChange(`${newVal}px`);
        }
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        setTimeout(() => setIsDragging(false), 0);
        if (!hasMoved) {
          setEditVal(String(num));
          setIsEditing(true);
        }
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [num, onChange],
  );

  if (isEditing) {
    return (
      <input
        autoFocus
        className="w-8 text-center text-[10px] bg-background border border-primary rounded outline-none tabular-nums"
        value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onBlur={() => {
          const v = Math.max(0, parseInt(editVal) || 0);
          onChange(`${v}px`);
          setIsEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            const v = Math.max(0, parseInt(editVal) || 0);
            onChange(`${v}px`);
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span
      className={cn(
        "w-8 text-center text-[10px] tabular-nums select-none font-medium text-foreground",
        "cursor-ew-resize rounded hover:bg-background/80 transition-colors py-0.5",
        isDragging && "cursor-ew-resize",
      )}
      onMouseDown={handleMouseDown}
      title="Drag to change · Click to type"
    >
      {num === 0 ? <span className="text-muted-foreground/40">—</span> : num}
    </span>
  );
}

/**
 * Box model spacing UI — renders concentric margin/padding boxes.
 * Hover over margin area → highlights on canvas in orange
 * Hover over padding area → highlights on canvas in green
 */
export function SpacingSection({
  style,
  onStyleChange,
  onSpacingHover,
}: SpacingSectionProps) {
  return (
    <CollapsibleSection title="Spacing">
      <div className="select-none">
        {/* ── Margin box ─────────────────────────────────────── */}
        <div
          className="relative rounded-md bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40 p-1 transition-colors hover:border-orange-300"
          onMouseEnter={() => onSpacingHover?.("margin")}
          onMouseLeave={() => onSpacingHover?.(null)}
        >
          <span className="absolute top-0.5 left-1.5 text-[9px] font-medium text-orange-500/70 uppercase tracking-wide pointer-events-none">
            Margin
          </span>

          {/* Top margin */}
          <div className="flex justify-center pt-2 pb-0.5">
            <SpacingInput
              value={style.marginTop ?? style.margin ?? ""}
              onChange={(v) => onStyleChange("marginTop", v || undefined)}
            />
          </div>

          <div className="flex items-center gap-1">
            {/* Left margin */}
            <SpacingInput
              value={style.marginLeft ?? style.margin ?? ""}
              onChange={(v) => onStyleChange("marginLeft", v || undefined)}
            />

            {/* ── Padding box ─────────────────────────────────── */}
            <div
              className="flex-1 rounded bg-green-50/60 dark:bg-green-950/20 border border-green-200/60 dark:border-green-800/40 p-1 transition-colors hover:border-green-300"
              onMouseEnter={(e) => {
                e.stopPropagation();
                onSpacingHover?.("padding");
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                onSpacingHover?.("margin");
              }}
            >
              <span className="flex justify-center text-[9px] font-medium text-green-600/70 uppercase tracking-wide pointer-events-none">
                Padding
              </span>

              {/* Top padding */}
              <div className="flex justify-center py-0.5">
                <SpacingInput
                  value={style.paddingTop ?? style.padding ?? ""}
                  onChange={(v) => onStyleChange("paddingTop", v || undefined)}
                />
              </div>

              <div className="flex items-center gap-1">
                {/* Left padding */}
                <SpacingInput
                  value={style.paddingLeft ?? style.padding ?? ""}
                  onChange={(v) => onStyleChange("paddingLeft", v || undefined)}
                />
                {/* Content area placeholder */}
                <div className="flex-1 rounded border border-dashed border-border/40 bg-muted/20 flex items-center justify-center py-2">
                  <span className="text-[9px] text-muted-foreground/40">content</span>
                </div>
                {/* Right padding */}
                <SpacingInput
                  value={style.paddingRight ?? style.padding ?? ""}
                  onChange={(v) => onStyleChange("paddingRight", v || undefined)}
                />
              </div>

              {/* Bottom padding */}
              <div className="flex justify-center py-0.5">
                <SpacingInput
                  value={style.paddingBottom ?? style.padding ?? ""}
                  onChange={(v) => onStyleChange("paddingBottom", v || undefined)}
                />
              </div>
            </div>

            {/* Right margin */}
            <SpacingInput
              value={style.marginRight ?? style.margin ?? ""}
              onChange={(v) => onStyleChange("marginRight", v || undefined)}
            />
          </div>

          {/* Bottom margin */}
          <div className="flex justify-center pt-0.5 pb-1">
            <SpacingInput
              value={style.marginBottom ?? style.margin ?? ""}
              onChange={(v) => onStyleChange("marginBottom", v || undefined)}
            />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
