import React from "react";
import { Label, Input, Separator } from "@ui-builder/ui";
import { cn } from "@ui-builder/ui";
import { NumericPropertyInput } from "../controls/NumericPropertyInput";
import { ColorInput } from "../controls/ColorInput";
import { CollapsibleSection } from "../controls/CollapsibleSection";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";

interface TypographySectionProps {
  style: Record<string, unknown>;
  onStyleChange: (key: string, value: unknown) => void;
}

const FONT_WEIGHTS = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "SemiBold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "ExtraBold" },
  { value: "900", label: "Black" },
];

const TEXT_ALIGN_OPTIONS = [
  { value: "left",    icon: <AlignLeft    className="h-3.5 w-3.5" />, label: "Left" },
  { value: "center",  icon: <AlignCenter  className="h-3.5 w-3.5" />, label: "Center" },
  { value: "right",   icon: <AlignRight   className="h-3.5 w-3.5" />, label: "Right" },
  { value: "justify", icon: <AlignJustify className="h-3.5 w-3.5" />, label: "Justify" },
];

function IconToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | string;
  onChange: (v: T) => void;
  options: { value: T; icon: React.ReactNode; label: string }[];
}) {
  return (
    <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.label}
          className={cn(
            "flex-1 flex items-center justify-center h-6 rounded transition-colors",
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

export function TypographySection({ style, onStyleChange }: TypographySectionProps) {
  const fontWeight = String(style.fontWeight ?? "");
  const textAlign = String(style.textAlign ?? "");

  return (
    <CollapsibleSection title="Typography">
      <div className="space-y-2.5">
        {/* Font family + size row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Family</Label>
            <Input
              className="h-7 text-xs"
              value={String(style.fontFamily ?? "")}
              placeholder="inherit"
              onChange={(e) => onStyleChange("fontFamily", e.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Size</Label>
            <NumericPropertyInput
              value={String(style.fontSize ?? "")}
              placeholder="16"
              units={["px", "rem", "em"]}
              min={0}
              onChange={(val) => onStyleChange("fontSize", val || undefined)}
            />
          </div>
        </div>

        {/* Weight row */}
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Weight</Label>
          <div className="flex gap-0.5 bg-muted rounded-md p-0.5 overflow-x-auto">
            {FONT_WEIGHTS.map((w) => (
              <button
                key={w.value}
                type="button"
                title={w.label}
                className={cn(
                  "flex-1 min-w-[28px] flex items-center justify-center h-6 rounded text-[10px] transition-colors",
                  fontWeight === w.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                )}
                style={{ fontWeight: w.value }}
                onClick={() => onStyleChange("fontWeight", w.value)}
              >
                {w.value.charAt(0) === "3" ? "L" : w.value.charAt(0) === "4" ? "R" : w.value.charAt(0) === "5" ? "M" : w.value.charAt(0) === "6" ? "S" : w.value.charAt(0) === "7" ? "B" : w.value.charAt(0) === "8" ? "E" : "K"}
              </button>
            ))}
          </div>
        </div>

        {/* Style toggles row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Style</Label>
            <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
              {[
                { key: "fontStyle",      value: "italic",       normal: "normal",        icon: <Italic       className="h-3.5 w-3.5" />, label: "Italic" },
                { key: "textDecoration", value: "underline",    normal: "none",           icon: <Underline    className="h-3.5 w-3.5" />, label: "Underline" },
                { key: "textDecoration", value: "line-through", normal: "none",           icon: <Strikethrough className="h-3.5 w-3.5" />, label: "Strikethrough" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  title={opt.label}
                  className={cn(
                    "flex-1 flex items-center justify-center h-6 rounded transition-colors",
                    style[opt.key] === opt.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                  )}
                  onClick={() =>
                    onStyleChange(
                      opt.key,
                      style[opt.key] === opt.value ? opt.normal : opt.value,
                    )
                  }
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Align</Label>
            <IconToggleGroup
              value={textAlign}
              onChange={(v) => onStyleChange("textAlign", v || undefined)}
              options={TEXT_ALIGN_OPTIONS}
            />
          </div>
        </div>

        {/* Line height */}
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Line height</Label>
          <NumericPropertyInput
            value={String(style.lineHeight ?? "")}
            placeholder="1.5"
            units={["", "px"]}
            min={0}
            onChange={(val) => onStyleChange("lineHeight", val || undefined)}
          />
        </div>

        <Separator />

        {/* Color */}
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Color</Label>
          <ColorInput
            value={String(style.color ?? "")}
            onChange={(v) => onStyleChange("color", v || undefined)}
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}
