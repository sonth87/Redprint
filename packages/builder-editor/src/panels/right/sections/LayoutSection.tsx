import React from "react";
import { Label, Separator } from "@ui-builder/ui";
import { cn } from "@ui-builder/ui";
import { NumericPropertyInput } from "../controls/NumericPropertyInput";
import { CollapsibleSection } from "../controls/CollapsibleSection";
import {
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Maximize2,
  WrapText,
} from "lucide-react";

interface LayoutSectionProps {
  style: Record<string, unknown>;
  onStyleChange: (key: string, value: unknown) => void;
}

function IconToggleGroup<T extends string>({
  value,
  onChange,
  options,
  columns,
}: {
  value: T | string;
  onChange: (v: T) => void;
  options: { value: T; icon: React.ReactNode; label: string }[];
  columns?: number;
}) {
  return (
    <div
      className={cn(
        "grid gap-0.5 bg-muted rounded-md p-0.5",
      )}
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0,1fr))` }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.label}
          className={cn(
            "flex items-center justify-center h-6 rounded transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50",
          )}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}

// Display options simplified
const DISPLAY_OPTIONS = [
  { value: "block",        label: "Block",        text: "Block" },
  { value: "flex",         label: "Flex",         text: "Flex" },
  { value: "grid",         label: "Grid",         text: "Grid" },
  { value: "inline-block", label: "Inline Block", text: "Inline" },
  { value: "none",         label: "Hidden",       text: "Hidden" },
];

const FLEX_DIR_OPTIONS = [
  { value: "row",            icon: <ArrowRight className="h-3.5 w-3.5" />, label: "Row →" },
  { value: "column",         icon: <ArrowDown  className="h-3.5 w-3.5" />, label: "Column ↓" },
  { value: "row-reverse",    icon: <ArrowLeft  className="h-3.5 w-3.5" />, label: "Row reverse ←" },
  { value: "column-reverse", icon: <ArrowUp    className="h-3.5 w-3.5" />, label: "Column reverse ↑" },
];

// Justify content icons (horizontal distribution)
const JUSTIFY_OPTIONS = [
  { value: "flex-start",    icon: <AlignStartVertical   className="h-3.5 w-3.5" />, label: "Start" },
  { value: "center",        icon: <AlignCenterVertical  className="h-3.5 w-3.5" />, label: "Center" },
  { value: "flex-end",      icon: <AlignEndVertical     className="h-3.5 w-3.5" />, label: "End" },
  { value: "space-between", icon: <span className="text-[9px] font-bold leading-none">⇿</span>, label: "Space between" },
  { value: "space-around",  icon: <span className="text-[9px] font-bold leading-none">↔</span>, label: "Space around" },
  { value: "space-evenly",  icon: <Maximize2 className="h-3 w-3" />, label: "Space evenly" },
];

// Align items icons (cross-axis)
const ALIGN_OPTIONS = [
  { value: "flex-start", icon: <AlignStartHorizontal  className="h-3.5 w-3.5" />, label: "Start" },
  { value: "center",     icon: <AlignCenterHorizontal className="h-3.5 w-3.5" />, label: "Center" },
  { value: "flex-end",   icon: <AlignEndHorizontal    className="h-3.5 w-3.5" />, label: "End" },
  { value: "stretch",    icon: <Maximize2             className="h-3.5 w-3.5" />, label: "Stretch" },
];

const FLEX_WRAP_OPTIONS = [
  { value: "nowrap",       icon: <span className="text-[9px]">—</span>,          label: "No wrap" },
  { value: "wrap",         icon: <WrapText className="h-3.5 w-3.5" />,            label: "Wrap" },
  { value: "wrap-reverse", icon: <WrapText className="h-3.5 w-3.5 rotate-180" />, label: "Wrap reverse" },
];

export function LayoutSection({ style, onStyleChange }: LayoutSectionProps) {
  const display = String(style.display ?? "");
  const isFlex = display === "flex" || display === "inline-flex";

  return (
    <CollapsibleSection title="Layout" defaultOpen={false}>
      <div className="space-y-2.5">
        {/* Display selector */}
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Display</Label>
          <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
            {DISPLAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                title={opt.label}
                className={cn(
                  "flex-1 flex items-center justify-center h-6 rounded text-[10px] font-medium transition-colors",
                  display === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                )}
                onClick={() => onStyleChange("display", opt.value)}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>

        {/* Flex-specific controls */}
        {isFlex && (
          <>
            <Separator />

            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">Direction</Label>
              <IconToggleGroup
                value={String(style.flexDirection ?? "row")}
                onChange={(v) => onStyleChange("flexDirection", v)}
                options={FLEX_DIR_OPTIONS}
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">Justify</Label>
              <IconToggleGroup
                value={String(style.justifyContent ?? "")}
                onChange={(v) => onStyleChange("justifyContent", v || undefined)}
                options={JUSTIFY_OPTIONS}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Align</Label>
                <IconToggleGroup
                  value={String(style.alignItems ?? "")}
                  onChange={(v) => onStyleChange("alignItems", v || undefined)}
                  options={ALIGN_OPTIONS}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Wrap</Label>
                <IconToggleGroup
                  value={String(style.flexWrap ?? "nowrap")}
                  onChange={(v) => onStyleChange("flexWrap", v === "nowrap" ? undefined : v)}
                  options={FLEX_WRAP_OPTIONS}
                />
              </div>
            </div>

            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">Gap</Label>
              <NumericPropertyInput
                value={String(style.gap ?? "")}
                placeholder="0"
                min={0}
                onChange={(val) => onStyleChange("gap", val || undefined)}
              />
            </div>
          </>
        )}

        {/* Position */}
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Position</Label>
            <div className="flex gap-0.5 flex-wrap">
              {["static", "relative", "absolute", "fixed", "sticky"].map((p) => (
                <button
                  key={p}
                  type="button"
                  title={p}
                  className={cn(
                    "px-1.5 h-6 text-[9px] rounded border transition-colors capitalize",
                    style.position === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
                  )}
                  onClick={() => onStyleChange("position", p === "static" ? undefined : p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Z-index</Label>
            <NumericPropertyInput
              value={String(style.zIndex ?? "")}
              placeholder="auto"
              units={[""]}
              onChange={(val) => onStyleChange("zIndex", val || undefined)}
            />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
